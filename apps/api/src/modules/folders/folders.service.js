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

function buildActiveNoteCountSelect(scope) {
  return {
    where: {
      deletedAt: null,
      // Count what belongs to the requested view: vault folders count
      // credentials, everything else counts ordinary notes. Credentials and
      // notes share the notes table, so the wrong side must never leak in.
      type: scope === 'vault' ? 'password' : { not: 'password' }
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

/** Split a folder path ("Work/Email" or "Work\\Email") into its segments. */
function splitFolderPath(pathString) {
  return String(pathString || '')
    .split(/[/\\]/)
    .map(segment => segment.trim())
    .filter(Boolean);
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
  async listFolders(userId, tenantId, parentId = null, scope = undefined) {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
        parentFolderId: parentId,
        ...(scope && { scope })
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(scope),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    return folders;
  },

  async getFolderHierarchy(userId, tenantId, scope = undefined) {
    const folders = await prisma.folder.findMany({
      where: { userId, tenantId, deletedAt: null, ...(scope && { scope }) },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: {
            notes: buildActiveNoteCountSelect(scope),
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
            notes: buildActiveNoteCountSelect(data.scope),
            subFolders: buildActiveSubfolderCountSelect()
          }
        }
      }
    });

    return folder;
  },

  /**
   * Resolve a set of folder paths ("Work/Email") to folder ids, creating any
   * missing segment along the way. Used by the credential import so a 700-row
   * spreadsheet costs one request instead of one POST per folder segment.
   *
   * Segments are matched case-insensitively against the existing tree, and the
   * in-memory map is updated as folders are created — so paths sharing a prefix
   * ("A/B" and "A/C") create "A" exactly once.
   *
   * @returns {Promise<Record<string, string>>} lowercased path -> folder id
   */
  async ensureFolderPaths(userId, tenantId, paths, scope = 'vault') {
    // Only reuse folders from the same scope, so a vault import never adopts a
    // same-named Notes folder (and vice versa).
    const folders = await prisma.folder.findMany({
      where: { userId, tenantId, deletedAt: null, scope },
      select: { id: true, name: true, parentFolderId: true }
    });

    // Group by parent so the full path map can be built from the flat list.
    const childrenByParent = new Map();
    folders.forEach((folder) => {
      const parentKey = folder.parentFolderId || '';
      if (!childrenByParent.has(parentKey)) {
        childrenByParent.set(parentKey, []);
      }
      childrenByParent.get(parentKey).push(folder);
    });

    const pathMap = new Map();
    const walk = (parentId, prefix) => {
      (childrenByParent.get(parentId || '') || []).forEach((folder) => {
        const path = prefix ? `${prefix}/${folder.name}` : folder.name;
        pathMap.set(path.toLowerCase(), folder.id);
        walk(folder.id, path);
      });
    };
    walk(null, '');

    for (const rawPath of paths) {
      const segments = splitFolderPath(rawPath);
      let parentId = null;
      let prefix = '';

      for (const segment of segments) {
        prefix = prefix ? `${prefix}/${segment}` : segment;
        const key = prefix.toLowerCase();

        if (pathMap.has(key)) {
          parentId = pathMap.get(key);
          continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const created = await prisma.folder.create({
          data: { name: segment, parentFolderId: parentId, userId, tenantId, scope },
          select: { id: true }
        });

        pathMap.set(key, created.id);
        parentId = created.id;
      }
    }

    return Object.fromEntries(pathMap);
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
