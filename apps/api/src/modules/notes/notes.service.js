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

// Credentials (Cofre) live in `vault` folders; every other note type lives in
// `note` folders. Keeping the two namespaces apart is what stops a credential
// from surfacing in the Notes view.
const VAULT_NOTE_TYPE = 'password';

/** Folder scope a note of this type is allowed to live in. */
function expectedFolderScope(noteType) {
  return noteType === VAULT_NOTE_TYPE ? 'vault' : 'note';
}

/**
 * Resolve an active folder and, when a note type is given, assert the folder's
 * scope matches it.
 *
 * `noteType` is intentionally optional: callers that are not moving a note
 * between folders pass nothing, so notes already stored in a mismatched folder
 * (created before this rule existed) stay editable. Only a folder *change* has
 * to satisfy the scope rule.
 */
async function ensureActiveFolder(userId, tenantId, folderId, noteType = null) {
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
    select: { id: true, scope: true }
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  if (noteType && folder.scope !== expectedFolderScope(noteType)) {
    throw new Error('Folder scope mismatch');
  }
}

export const notesService = {
  /**
   * Sincronização delta, com cursor estável.
   *
   * Devolve apenas o necessário para hidratar um cache local: o ciphertext e os
   * metadados não sensíveis. Ordena por `updatedAt` crescente (desempatando por
   * `id`) para que o cliente possa retomar de onde parou usando o `updatedAt`
   * da última nota recebida.
   *
   * Diferente de `listNotes`, inclui registros com `deletedAt` preenchido: o
   * cliente precisa saber o que remover do cache local. Por isso o filtro
   * `since` compara `updatedAt`, que o soft delete também atualiza.
   *
   * @param {string} userId
   * @param {string} tenantId
   * @param {{cursor?: string, since?: string, limit: number, type?: string}} filters
   * @returns {Promise<{data: Array, nextCursor: string|null, hasMore: boolean}>}
   */
  async syncNotes(userId, tenantId, filters) {
    const { cursor, since, limit, type } = filters;
    const includeMetadata = await supportsNoteMetadataColumns();

    const notes = await prisma.note.findMany({
      where: {
        userId,
        tenantId,
        ...(type && { type }),
        ...(since && { updatedAt: { gt: new Date(since) } })
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1, // +1 sonda se há próxima página, sem COUNT extra.
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        ...buildNoteScalarSelect(includeMetadata),
        // Nome/cor da pasta já são texto puro (o endpoint de pastas os expõe) e
        // a UI de detalhe do Cofre depende deles.
        folder: {
          select: { id: true, name: true, color: true, icon: true }
        }
      }
    });

    const hasMore = notes.length > limit;
    const page = hasMore ? notes.slice(0, limit) : notes;

    return {
      data: page,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      hasMore
    };
  },

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

    await ensureActiveFolder(userId, tenantId, persistedData.folderId, persistedData.type);

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

    // Validate every referenced folder at once, keeping each folder's scope so
    // a row cannot be filed into the wrong namespace (credential vs note).
    const folderIds = [...new Set(notes.map(note => note.folderId).filter(Boolean))];
    let folderScopeById = new Map();

    if (folderIds.length > 0) {
      const folders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          userId,
          tenantId,
          deletedAt: null
        },
        select: { id: true, scope: true }
      });
      folderScopeById = new Map(folders.map(folder => [folder.id, folder.scope]));
    }

    const errors = [];
    const rows = [];

    notes.forEach((note, index) => {
      if (note.folderId && !folderScopeById.has(note.folderId)) {
        errors.push({ index, message: 'Folder not found' });
        return;
      }

      if (note.folderId && folderScopeById.get(note.folderId) !== expectedFolderScope(note.type)) {
        errors.push({ index, message: 'Folder scope mismatch' });
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

    // A move (drag & drop included) must land in a folder whose scope matches
    // the note type. Edits that leave the folder untouched skip the scope check
    // so notes stored in a mismatched folder before this rule stay editable.
    const isMovingFolder =
      data.folderId !== undefined && data.folderId !== existingNote.folderId;

    await ensureActiveFolder(
      userId,
      tenantId,
      data.folderId !== undefined ? data.folderId : existingNote.folderId,
      isMovingFolder ? (data.type ?? existingNote.type) : null
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
