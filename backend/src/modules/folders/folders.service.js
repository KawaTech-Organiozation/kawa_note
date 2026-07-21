import { prisma } from '../../config/database.js';
import { buildNoteScalarSelect, supportsNoteMetadataColumns } from '../notes/notes.compat.js';

function buildComputedCounts(folderMap, folderId) {
  const node = folderMap.get(folderId);
  if (!node) {
    return {
      directNotes: 0,
      directSubfolders: 0,
      recursiveNotes: 0,
      recursiveSubfolders: 0
    };
  }

  let recursiveNotes = node._count?.notes || 0;
  let recursiveSubfolders = node._count?.subFolders || 0;

  node.children.forEach((child) => {
    const childCounts = buildComputedCounts(folderMap, child.id);
    recursiveNotes += childCounts.recursiveNotes;
    recursiveSubfolders += childCounts.recursiveSubfolders;
  });

  const computedCounts = {
    directNotes: node._count?.notes || 0,
    directSubfolders: node._count?.subFolders || 0,
    recursiveNotes,
    recursiveSubfolders
  };

  node.computedCounts = computedCounts;
  return computedCounts;
}

function buildActiveNoteCountSelect() {
  return {
    where: {
      deletedAt: null,
      // Credentials (Cofre) live in the notes table but must not inflate the
      // Notes folder counts. The Vault computes its own counts client-side.
      type: { not: 'password' }
    }
  };
}

function buildActiveSubfolderCountSelect() {
  return {
    where: {
      deletedAt: null
    }
  };
}

async function collectDescendantFolderIds(folderId, userId, tenantId) {
  const descendantIds = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    descendantIds.push(currentId);

    const children = await prisma.folder.findMany({
      where: {
        parentFolderId: currentId,
        userId,
        tenantId,
        deletedAt: null
      },
      select: { id: true }
    });

    children.forEach((child) => queue.push(child.id));
  }

  return descendantIds;
}

export const foldersService = {
  async listFolders(userId, tenantId, parentId = null) {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
        parentFolderId: parentId
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    return folders;
  },

  async getFolderHierarchy(userId, tenantId) {
    const folders = await prisma.folder.findMany({
      where: { userId, tenantId, deletedAt: null },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    // Build tree structure
    const folderMap = new Map();
    const rootFolders = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (folder.parentFolderId && folderMap.has(folder.parentFolderId)) {
        folderMap.get(folder.parentFolderId).children.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    rootFolders.forEach((rootFolder) => {
      buildComputedCounts(folderMap, rootFolder.id);
    });

    return rootFolders;
  },

  async getFolderById(userId, tenantId, folderId) {
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        tenantId,
        deletedAt: null
      },
      include: {
        subFolders: {
          where: {
            deletedAt: null
          },
          orderBy: [
            { order: 'asc' },
            { name: 'asc' }
          ],
          include: {
            _count: {
              select: {
                notes: buildActiveNoteCountSelect(),
                subFolders: buildActiveSubfolderCountSelect()
              }
            }
          }
        },
        notes: {
          where: {
            deletedAt: null
          },
          orderBy: [
            { pinned: 'desc' },
            { updatedAt: 'desc' }
          ],
          take: 50
        },
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    if (folder) {
      const hierarchy = await this.getFolderHierarchy(userId, tenantId);
      const allNodes = [];
      const stack = [...hierarchy];

      while (stack.length > 0) {
        const current = stack.pop();
        allNodes.push(current);
        current.children?.forEach((child) => stack.push(child));
      }

      const hierarchyMatch = allNodes.find((item) => item.id === folder.id);
      if (hierarchyMatch?.computedCounts) {
        folder.computedCounts = hierarchyMatch.computedCounts;
      }
    }

    return folder;
  },

  async createFolder(userId, tenantId, data) {
    // Validate parent folder exists and belongs to user/tenant
    if (data.parentFolderId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: data.parentFolderId,
          userId,
          tenantId,
          deletedAt: null
        }
      });

      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }
    }

    const folder = await prisma.folder.create({
      data: {
        ...data,
        userId,
        tenantId
      },
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    return folder;
  },

  async updateFolder(userId, tenantId, folderId, data) {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingFolder) {
      throw new Error('Folder not found');
    }

    // Validate parent folder if provided
    if (data.parentFolderId) {
      if (data.parentFolderId === folderId) {
        throw new Error('Folder cannot be its own parent');
      }

      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: data.parentFolderId,
          userId,
          tenantId,
          deletedAt: null
        }
      });

      if (!parentFolder) {
        throw new Error('Parent folder not found');
      }

      // Check for circular reference
      let current = parentFolder;
      while (current.parentFolderId) {
        if (current.parentFolderId === folderId) {
          throw new Error('Circular reference detected');
        }
        current = await prisma.folder.findUnique({
          where: { id: current.parentFolderId }
        });
      }
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data,
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    return folder;
  },

  async deleteFolder(userId, tenantId, folderId) {
    const existingFolder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        tenantId,
        deletedAt: null
      }
    });

    if (!existingFolder) {
      throw new Error('Folder not found');
    }

    const folderIds = await collectDescendantFolderIds(folderId, userId, tenantId);
    const now = new Date();

    const [foldersResult, notesResult] = await prisma.$transaction([
      prisma.folder.updateMany({
        where: {
          id: { in: folderIds },
          userId,
          tenantId,
          deletedAt: null
        },
        data: {
          deletedAt: now,
          deletedByUserId: userId
        }
      }),
      prisma.note.updateMany({
        where: {
          folderId: { in: folderIds },
          userId,
          tenantId,
          deletedAt: null
        },
        data: {
          deletedAt: now,
          deletedByUserId: userId
        }
      })
    ]);

    return {
      id: folderId,
      affectedFolders: foldersResult.count,
      affectedNotes: notesResult.count
    };
  },

  async getFolderNotes(userId, tenantId, folderId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const includeMetadata = await supportsNoteMetadataColumns();

    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        tenantId,
        deletedAt: null
      }
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: {
          folderId,
          userId,
          tenantId,
          deletedAt: null
        },
        skip,
        take: limit,
        orderBy: [
          { pinned: 'desc' },
          { updatedAt: 'desc' }
        ],
        select: buildNoteScalarSelect(includeMetadata)
      }),
      prisma.note.count({
        where: {
          folderId,
          userId,
          tenantId,
          deletedAt: null
        }
      })
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
  }
};
