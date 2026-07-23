import { prisma } from '../../config/database.js';
import { buildNoteScalarSelect, supportsNoteMetadataColumns } from '../notes/notes.compat.js';

export const relationsService = {
  async listRelations(userId, tenantId, options = {}) {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    const [relations, total] = await Promise.all([
      prisma.relation.findMany({
        where: {
          tenantId,
          noteFrom: {
            userId,
            tenantId,
            deletedAt: null
          },
          noteTo: {
            userId,
            tenantId,
            deletedAt: null
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          noteFrom: {
            select: {
              id: true,
              title: true,
              type: true
            }
          },
          noteTo: {
            select: {
              id: true,
              title: true,
              type: true
            }
          }
        }
      }),
      prisma.relation.count({
        where: {
          tenantId,
          noteFrom: {
            userId,
            tenantId,
            deletedAt: null
          },
          noteTo: {
            userId,
            tenantId,
            deletedAt: null
          }
        }
      })
    ]);

    return {
      relations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getRelatedNotes(userId, tenantId, noteId) {
    const includeMetadata = await supportsNoteMetadataColumns();

    // Verify note exists and belongs to user/tenant
    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
        tenantId,
        deletedAt: null
      },
      select: buildNoteScalarSelect(includeMetadata)
    });

    if (!note) {
      throw new Error('Note not found');
    }

    const relations = await prisma.relation.findMany({
      where: {
        tenantId,
        noteFrom: {
          deletedAt: null
        },
        noteTo: {
          deletedAt: null
        },
        OR: [
          { noteFromId: noteId },
          { noteToId: noteId }
        ]
      },
      include: {
        noteFrom: {
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            tags: true,
            isEncrypted: true
          }
        },
        noteTo: {
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            tags: true,
            isEncrypted: true
          }
        }
      }
    });

    // Transform to show related notes with relation info
    const relatedNotes = relations.map(relation => {
      const isFromNote = relation.noteFromId === noteId;
      const relatedNote = isFromNote ? relation.noteTo : relation.noteFrom;
      
      return {
        relationId: relation.id,
        relationType: relation.relationType,
        strength: relation.strength,
        context: relation.context,
        direction: isFromNote ? 'outgoing' : 'incoming',
        note: relatedNote
      };
    });

    return relatedNotes;
  },

  async createRelation(userId, tenantId, data) {
    const includeMetadata = await supportsNoteMetadataColumns();

    // Verify both notes exist and belong to user/tenant
    const [noteFrom, noteTo] = await Promise.all([
      prisma.note.findFirst({
        where: {
          id: data.noteFromId,
          userId,
          tenantId,
          deletedAt: null
        },
        select: buildNoteScalarSelect(includeMetadata)
      }),
      prisma.note.findFirst({
        where: {
          id: data.noteToId,
          userId,
          tenantId,
          deletedAt: null
        },
        select: buildNoteScalarSelect(includeMetadata)
      })
    ]);

    if (!noteFrom) {
      throw new Error('Source note not found');
    }

    if (!noteTo) {
      throw new Error('Target note not found');
    }

    if (data.noteFromId === data.noteToId) {
      throw new Error('Cannot create relation to the same note');
    }

    // Check if relation already exists
    const existingRelation = await prisma.relation.findFirst({
      where: {
        tenantId,
        OR: [
          {
            noteFromId: data.noteFromId,
            noteToId: data.noteToId
          },
          {
            noteFromId: data.noteToId,
            noteToId: data.noteFromId
          }
        ]
      }
    });

    if (existingRelation) {
      throw new Error('Relation already exists');
    }

    const relation = await prisma.relation.create({
      data: {
        ...data,
        tenantId
      },
      include: {
        noteFrom: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        noteTo: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });

    return relation;
  },

  async updateRelation(userId, tenantId, relationId, data) {
    // Verify relation exists and belongs to tenant
    const existingRelation = await prisma.relation.findFirst({
      where: {
        id: relationId,
        tenantId
      }
    });

    if (!existingRelation) {
      throw new Error('Relation not found');
    }

    const relation = await prisma.relation.update({
      where: { id: relationId },
      data,
      include: {
        noteFrom: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        noteTo: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });

    return relation;
  },

  async deleteRelation(userId, tenantId, relationId) {
    // Verify relation exists and belongs to tenant
    const existingRelation = await prisma.relation.findFirst({
      where: {
        id: relationId,
        tenantId
      }
    });

    if (!existingRelation) {
      throw new Error('Relation not found');
    }

    await prisma.relation.delete({
      where: { id: relationId }
    });

    return { id: relationId };
  },

  async getRelationGraph(userId, tenantId) {
    const relations = await prisma.relation.findMany({
      where: {
        tenantId,
        noteFrom: {
          userId,
          tenantId,
          deletedAt: null
        },
        noteTo: {
          userId,
          tenantId,
          deletedAt: null
        }
      },
      include: {
        noteFrom: {
          select: {
            id: true,
            title: true,
            type: true
          }
        },
        noteTo: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });

    // Get all unique notes involved in relations
    const noteIds = new Set();
    relations.forEach(r => {
      noteIds.add(r.noteFromId);
      noteIds.add(r.noteToId);
    });

    const notes = await prisma.note.findMany({
      where: {
        id: { in: Array.from(noteIds) },
        userId,
        tenantId,
        deletedAt: null
      },
      select: {
        id: true,
        title: true,
        type: true,
        tags: true
      }
    });

    return {
      nodes: notes.map(note => ({
        id: note.id,
        label: note.title,
        type: note.type,
        tags: note.tags
      })),
      edges: relations.map(relation => ({
        id: relation.id,
        source: relation.noteFromId,
        target: relation.noteToId,
        type: relation.relationType,
        strength: relation.strength
      }))
    };
  }
};
