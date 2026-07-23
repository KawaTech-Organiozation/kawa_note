import { describe, it, expect, beforeEach, vi } from 'vitest';
import { foldersService } from '../folders.service.js';
import { prisma } from '../../../config/database.js';

vi.mock('../../../config/database.js', () => ({
  prisma: {
    folder: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    note: {},
    $queryRaw: vi.fn()
  }
}));

const USER_ID = 'user-1';
const TENANT_ID = 'tenant-1';

/** Make folder.create hand out predictable ids. */
function stubCreates() {
  let counter = 0;
  prisma.folder.create.mockImplementation(async () => ({ id: `new-${++counter}` }));
}

describe('foldersService.ensureFolderPaths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubCreates();
  });

  it('reads the existing tree with a single query', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['A', 'B']);

    expect(prisma.folder.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.folder.findMany).toHaveBeenCalledWith({
      // Defaults to the vault namespace.
      where: { userId: USER_ID, tenantId: TENANT_ID, deletedAt: null, scope: 'vault' },
      select: { id: true, name: true, parentFolderId: true }
    });
  });

  it('creates a shared prefix exactly once', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    const map = await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['A/B', 'A/C']);

    // A, A/B, A/C — three creates, not four.
    expect(prisma.folder.create).toHaveBeenCalledTimes(3);
    expect(map['a']).toBe('new-1');
    expect(map['a/b']).toBe('new-2');
    expect(map['a/c']).toBe('new-3');

    const childCalls = prisma.folder.create.mock.calls.slice(1);
    childCalls.forEach(([args]) => {
      expect(args.data.parentFolderId).toBe('new-1');
    });
  });

  it('reuses existing folders instead of recreating them', async () => {
    prisma.folder.findMany.mockResolvedValue([
      { id: 'root-1', name: 'Work', parentFolderId: null },
      { id: 'child-1', name: 'Email', parentFolderId: 'root-1' }
    ]);

    const map = await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['Work/Email']);

    expect(prisma.folder.create).not.toHaveBeenCalled();
    expect(map['work/email']).toBe('child-1');
  });

  it('matches existing folders case-insensitively', async () => {
    prisma.folder.findMany.mockResolvedValue([{ id: 'root-1', name: 'Work', parentFolderId: null }]);

    const map = await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['WORK/Email']);

    expect(prisma.folder.create).toHaveBeenCalledTimes(1);
    expect(prisma.folder.create.mock.calls[0][0].data.parentFolderId).toBe('root-1');
    expect(map['work/email']).toBe('new-1');
  });

  it('accepts backslash separators and ignores blank segments', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    const map = await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['Root\\ Sub //Leaf']);

    expect(prisma.folder.create).toHaveBeenCalledTimes(3);
    expect(map['root/sub/leaf']).toBe('new-3');
  });

  it('scopes every created folder to the caller and to the vault namespace', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['A']);

    expect(prisma.folder.create).toHaveBeenCalledWith({
      data: { name: 'A', parentFolderId: null, userId: USER_ID, tenantId: TENANT_ID, scope: 'vault' },
      select: { id: true }
    });
  });

  it('queries and creates within the requested scope', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['A'], 'note');

    expect(prisma.folder.findMany.mock.calls[0][0].where.scope).toBe('note');
    expect(prisma.folder.create.mock.calls[0][0].data.scope).toBe('note');
  });

  it('does not reuse a same-named folder from another scope', async () => {
    // A 'note' folder named "Work" exists, but the vault query returns nothing,
    // so a fresh vault "Work" is created rather than adopting the note folder.
    prisma.folder.findMany.mockResolvedValue([]);

    const map = await foldersService.ensureFolderPaths(USER_ID, TENANT_ID, ['Work'], 'vault');

    expect(prisma.folder.create).toHaveBeenCalledTimes(1);
    expect(map['work']).toBe('new-1');
  });
});

describe('foldersService scope filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.folder.findMany.mockResolvedValue([]);
  });

  it('getFolderHierarchy filters by scope when provided', async () => {
    await foldersService.getFolderHierarchy(USER_ID, TENANT_ID, 'vault');

    expect(prisma.folder.findMany.mock.calls[0][0].where).toMatchObject({
      userId: USER_ID,
      tenantId: TENANT_ID,
      deletedAt: null,
      scope: 'vault'
    });
  });

  it('getFolderHierarchy omits the scope filter when not provided', async () => {
    await foldersService.getFolderHierarchy(USER_ID, TENANT_ID);

    expect(prisma.folder.findMany.mock.calls[0][0].where).not.toHaveProperty('scope');
  });

  it('listFolders filters by scope when provided', async () => {
    await foldersService.listFolders(USER_ID, TENANT_ID, null, 'note');

    expect(prisma.folder.findMany.mock.calls[0][0].where.scope).toBe('note');
  });
});

describe('foldersService.createFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.folder.create.mockResolvedValue({ id: 'f-1', _count: { notes: 0, subFolders: 0 } });
  });

  it('persists the given scope', async () => {
    await foldersService.createFolder(USER_ID, TENANT_ID, { name: 'Cofre', scope: 'vault' });

    expect(prisma.folder.create.mock.calls[0][0].data).toMatchObject({
      name: 'Cofre',
      scope: 'vault',
      userId: USER_ID,
      tenantId: TENANT_ID
    });
  });
});
