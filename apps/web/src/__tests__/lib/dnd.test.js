import { describe, it, expect } from 'vitest';
import {
  DROPPABLE_LIST,
  DROPPABLE_ROOT,
  folderDroppableId,
  parseFolderDroppableId
} from '@/lib/dnd';

describe('parseFolderDroppableId', () => {
  it('reconhece uma pasta e devolve o folderId', () => {
    expect(parseFolderDroppableId(folderDroppableId('abc-123'))).toEqual({
      isFolder: true,
      folderId: 'abc-123'
    });
  });

  it('trata a raiz como pasta com folderId nulo (tira o item de qualquer pasta)', () => {
    expect(parseFolderDroppableId(DROPPABLE_ROOT)).toEqual({
      isFolder: true,
      folderId: null
    });
  });

  it('não trata a lista de origem como alvo de pasta', () => {
    expect(parseFolderDroppableId(DROPPABLE_LIST)).toEqual({
      isFolder: false,
      folderId: null
    });
  });

  it('não trata valores ausentes como alvo de pasta', () => {
    expect(parseFolderDroppableId(undefined)).toEqual({ isFolder: false, folderId: null });
    expect(parseFolderDroppableId('')).toEqual({ isFolder: false, folderId: null });
  });
});

describe('folderDroppableId', () => {
  it('gera um id que o parser devolve intacto', () => {
    const id = folderDroppableId('pasta-com-hifen-e-numero-9');
    expect(parseFolderDroppableId(id).folderId).toBe('pasta-com-hifen-e-numero-9');
  });

  it('não colide com o id da raiz', () => {
    expect(folderDroppableId('qualquer')).not.toBe(DROPPABLE_ROOT);
  });
});
