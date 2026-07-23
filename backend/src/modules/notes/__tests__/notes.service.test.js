import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notesService } from '../notes.service.js';
import { prisma } from '../../../config/database.js';

vi.mock('../../../config/database.js', () => ({
  prisma: {
    note: {
      create: vi.fn(),
      createMany: vi.fn()
    },
    folder: {
      findMany: vi.fn()
    },
    // Used by notes.compat to detect the metadata columns.
    $queryRaw: vi.fn()
  }
}));

const USER_ID = 'user-1';
const TENANT_ID = 'tenant-1';

function credential(overrides = {}) {
  return {
    title: 'Login',
    content: 'ciphertext',
    type: 'password',
    tags: '',
    isEncrypted: true,
    pinned: false,
    folderId: null,
    ...overrides
  };
}

describe('notesService.createNotesBulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.folder.findMany.mockResolvedValue([]);
  });

  it('creates a whole batch in a single createMany call', async () => {
    const notes = [credential({ title: 'A' }), credential({ title: 'B' }), credential({ title: 'C' })];
    prisma.note.createMany.mockResolvedValue({ count: 3 });

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, notes);

    expect(result).toEqual({ created: 3, errors: [] });
    expect(prisma.note.createMany).toHaveBeenCalledTimes(1);
    expect(prisma.note.create).not.toHaveBeenCalled();

    const inserted = prisma.note.createMany.mock.calls[0][0].data;
    expect(inserted).toHaveLength(3);
    inserted.forEach((row) => {
      expect(row.userId).toBe(USER_ID);
      expect(row.tenantId).toBe(TENANT_ID);
    });
  });

  it('validates every referenced folder with a single query', async () => {
    prisma.folder.findMany.mockResolvedValue([{ id: 'folder-1', scope: 'vault' }]);
    prisma.note.createMany.mockResolvedValue({ count: 2 });

    await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ folderId: 'folder-1' }),
      credential({ folderId: 'folder-1' })
    ]);

    expect(prisma.folder.findMany).toHaveBeenCalledTimes(1);
    // `scope` é selecionado junto: a mesma query resolve posse e namespace.
    expect(prisma.folder.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['folder-1'] }, userId: USER_ID, tenantId: TENANT_ID, deletedAt: null },
      select: { id: true, scope: true }
    });
  });

  it('fails only the row whose folder belongs to someone else', async () => {
    // 'folder-other' is not returned by the ownership query.
    prisma.folder.findMany.mockResolvedValue([{ id: 'folder-mine', scope: 'vault' }]);
    prisma.note.createMany.mockResolvedValue({ count: 2 });

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ title: 'ok-1', folderId: 'folder-mine' }),
      credential({ title: 'bad', folderId: 'folder-other' }),
      credential({ title: 'ok-2', folderId: null })
    ]);

    expect(result.created).toBe(2);
    expect(result.errors).toEqual([{ index: 1, message: 'Folder not found' }]);
    expect(prisma.note.createMany.mock.calls[0][0].data).toHaveLength(2);
  });

  it('rejects a credential filed into a Notes-scoped folder', async () => {
    // Pasta existe e pertence ao usuário, mas é do namespace de Notas.
    prisma.folder.findMany.mockResolvedValue([{ id: 'folder-notes', scope: 'note' }]);
    prisma.note.createMany.mockResolvedValue({ count: 1 });

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ title: 'ok', folderId: null }),
      credential({ title: 'wrong-namespace', folderId: 'folder-notes' })
    ]);

    expect(result.errors).toEqual([{ index: 1, message: 'Folder scope mismatch' }]);
    expect(prisma.note.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it('accepts a plain note in a Notes-scoped folder', async () => {
    prisma.folder.findMany.mockResolvedValue([{ id: 'folder-notes', scope: 'note' }]);
    prisma.note.createMany.mockResolvedValue({ count: 1 });

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ title: 'nota', type: 'text', folderId: 'folder-notes' })
    ]);

    expect(result).toEqual({ created: 1, errors: [] });
  });

  it('skips the database entirely when no row is valid', async () => {
    prisma.folder.findMany.mockResolvedValue([]);

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ folderId: 'folder-other' })
    ]);

    expect(result).toEqual({ created: 0, errors: [{ index: 0, message: 'Folder not found' }] });
    expect(prisma.note.createMany).not.toHaveBeenCalled();
  });

  it('falls back to per-row inserts to pinpoint the failing row', async () => {
    prisma.note.createMany.mockRejectedValue(new Error('batch write failed'));
    prisma.note.create
      .mockResolvedValueOnce({ id: 'note-1' })
      .mockRejectedValueOnce(new Error('content too long'))
      .mockResolvedValueOnce({ id: 'note-3' });

    const result = await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ title: 'A' }),
      credential({ title: 'B' }),
      credential({ title: 'C' })
    ]);

    expect(result.created).toBe(2);
    expect(result.errors).toEqual([{ index: 1, message: 'content too long' }]);
    expect(prisma.note.create).toHaveBeenCalledTimes(3);
  });

  it('never queues metadata enrichment, so no url is fetched during an import', async () => {
    prisma.note.createMany.mockResolvedValue({ count: 1 });

    await notesService.createNotesBulk(USER_ID, TENANT_ID, [
      credential({ type: 'url', url: 'https://example.com' })
    ]);

    // createMany returns no ids; enrichment is intentionally out of the bulk path.
    expect(prisma.note.createMany).toHaveBeenCalledTimes(1);
  });
});
