import { prisma } from '../../config/database.js';
import { queueMetadataEnrichment } from './notes.metadata.js';
import { buildNoteScalarSelect, supportsNoteMetadataColumns } from './notes.compat.js';

function getMetadataStatus(data, existingNote = null) {
  const url = data.url !== undefined ? data.url : existingNote?.url;
  if (!url) {
    return 'idle';
  }

  if (data.previewData) {
    return 'ready';
  }

  if (data.metadataStatus) {
    return data.metadataStatus;
  }

  return 'queued';
}

async function ensureActiveFolder(userId, tenantId, folderId) {
  if (!folderId) {
    return;
  }

  const folder = await prisma.folder.findFirst({
    where: {
      id: folderId,
      userId,
      tenantId,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!folder) {
    throw new Error('Folder not found');
  }
}

export const notesService = {
  async listNotes(userId, tenantId, filters) {
    const { page, limit, folderId, tags, pinned, type, excludeType } = filters;
    const skip = (page - 1) * limit;
    const includeMetadata = await supportsNoteMetadataColumns();

    const where = {
      userId,
      tenantId,
      deletedAt: null,
      ...(folderId && { folderId }),
      ...(pinned !== undefined && { pinned }),
      // Vault/Cofre isolation: include a single type (e.g. 'password') or
      // exclude one (e.g. keep credentials out of the Notes view).
      ...(type && { type }),
      ...(excludeType && { type: { not: excludeType } }),
      ...(tags && {
        tags: {
          hasSome: tags.split(',')
        }
      })
    };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { pinned: 'desc' },
          { updatedAt: 'desc' }
        ],
        select: {
          ...buildNoteScalarSelect(includeMetadata),
          folder: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          relationsFrom: {
            include: {
              noteTo: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      }),
      prisma.note.count({ where })
    ]);

    return {
      notes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getNoteById(userId, tenantId, noteId) {
    const includeMetadata = await supportsNoteMetadataColumns();

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null
      },
      select: {
        ...buildNoteScalarSelect(includeMetadata),
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        relationsFrom: {
          include: {
            noteTo: {
              select: {
                id: true,
                title: true,
                type: true
              }
            }
          }
        },
        relationsTo: {
          include: {
            noteFrom: {
              select: {
                id: true,
                title: true,
                type: true
              }
            }
          }
        }
      }
    });

    return note;
  },

  async createNote(userId, tenantId, data) {
    const includeMetadata = await supportsNoteMetadataColumns();
    const metadataStatus = getMetadataStatus(data);
    const { metadataStatus: _metadataStatus, ...persistedData } = data;

    await ensureActiveFolder(userId, tenantId, persistedData.folderId);

    const note = await prisma.note.create({
      data: {
        ...persistedData,
        userId,
        tenantId,
        ...(includeMetadata && {
          metadataStatus,
          metadataFetchedAt: metadataStatus === 'ready' ? new Date() : null
        })
      },
      select: {
        ...buildNoteScalarSelect(includeMetadata),
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    // Never enrich credentials: no outbound fetch of login URLs (privacy/SSRF).
    if (includeMetadata && note.url && note.type !== 'password' && metadataStatus === 'queued') {
      queueMetadataEnrichment({
        noteId: note.id,
        userId,
        tenantId,
        url: note.url
      });
    }

    return note;
  },

  /**
   * Create many notes in a single round trip (credential import).
   *
   * Deliberately different from createNote in two ways:
   * - Folder ownership is validated for the whole batch in ONE query instead of
   *   one per note (the batched equivalent of ensureActiveFolder).
   * - Metadata enrichment is never queued. Credentials (type 'password') are
   *   already excluded from enrichment in createNote, and the import flow is the
   *   only caller today, so nothing is lost. createMany also returns no ids to
   *   enqueue with.
   *
   * A note pointing at a folder the user does not own fails on its own index
   * without aborting the rest of the batch.
   *
   * @returns {Promise<{created: number, errors: Array<{index: number, message: string}>}>}
   */
  async createNotesBulk(userId, tenantId, notes) {
    const includeMetadata = await supportsNoteMetadataColumns();

    // Validate every referenced folder at once.
    const folderIds = [...new Set(notes.map(note => note.folderId).filter(Boolean))];
    let validFolderIds = new Set();

    if (folderIds.length > 0) {
      const folders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          userId,
          tenantId,
          deletedAt: null
        },
        select: { id: true }
      });
      validFolderIds = new Set(folders.map(folder => folder.id));
    }

    const errors = [];
    const rows = [];

    notes.forEach((note, index) => {
      if (note.folderId && !validFolderIds.has(note.folderId)) {
        errors.push({ index, message: 'Folder not found' });
        return;
      }

      const metadataStatus = getMetadataStatus(note);
      const { metadataStatus: _metadataStatus, ...persistedData } = note;

      rows.push({
        index,
        data: {
          ...persistedData,
          userId,
          tenantId,
          ...(includeMetadata && {
            metadataStatus,
            metadataFetchedAt: metadataStatus === 'ready' ? new Date() : null
          })
        }
      });
    });

    if (rows.length === 0) {
      return { created: 0, errors };
    }

    try {
      const result = await prisma.note.createMany({ data: rows.map(row => row.data) });
      return { created: result.count, errors };
    } catch {
      // Fast path failed: retry one by one so the caller learns exactly which
      // rows are bad instead of losing the whole batch.
      let created = 0;

      for (const row of rows) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await prisma.note.create({ data: row.data, select: { id: true } });
          created += 1;
        } catch (error) {
          errors.push({ index: row.index, message: error.message || 'Failed to create note' });
        }
      }

      return { created, errors };
    }
  },

  async updateNote(userId, tenantId, noteId, data) {
    const includeMetadata = await supportsNoteMetadataColumns();
    const { metadataStatus: _metadataStatus, ...persistedData } = data;
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null
      },
      select: buildNoteScalarSelect(includeMetadata)
    });

    if (!existingNote) {
      throw new Error('Note not found');
    }

    await ensureActiveFolder(
      userId,
      tenantId,
      data.folderId !== undefined ? data.folderId : existingNote.folderId
    );

    const metadataStatus = getMetadataStatus(data, existingNote);
    const shouldRefreshMetadata = Boolean(
      (data.url !== undefined && data.url !== existingNote.url) ||
      (data.previewData === null && (data.url !== undefined ? data.url : existingNote.url))
    );

    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...persistedData,
        ...(includeMetadata && {
          metadataStatus: shouldRefreshMetadata ? 'queued' : metadataStatus,
          metadataFetchedAt: shouldRefreshMetadata ? null : existingNote.metadataFetchedAt
        })
      },
      select: {
        ...buildNoteScalarSelect(includeMetadata),
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    });

    if (includeMetadata && note.url && note.type !== 'password' && (shouldRefreshMetadata || note.metadataStatus === 'queued')) {
      queueMetadataEnrichment({
        noteId: note.id,
        userId,
        tenantId,
        url: note.url
      });
    }

    return note;
  },

  async deleteNote(userId, tenantId, noteId) {
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null
      },
      select: { id: true, folderId: true }
    });

    if (!existingNote) {
      throw new Error('Note not found');
    }

    await prisma.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
        deletedByUserId: userId
      }
    });

    return { id: noteId, folderId: existingNote.folderId };
  },

  async searchNotes(userId, tenantId, query) {
    // Text search on encrypted fields is not supported in E2E architecture
    // Search is performed client-side after decryption
    // This endpoint now only searches by tags
    const includeMetadata = await supportsNoteMetadataColumns();

    const notes = await prisma.note.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
        tags: { hasSome: [query] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        ...buildNoteScalarSelect(includeMetadata),
        folder: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return notes;
  }
};
