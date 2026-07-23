/**
 * Constantes e helpers do drag & drop de notas/credenciais entre pastas.
 *
 * A biblioteca usada é `@hello-pangea/dnd`. Ela foi escolhida por já estar no
 * projeto e, principalmente, por oferecer arraste por teclado nativo — a
 * governança de frontend trata violação de WCAG 2.1 AA como critério de HALT.
 * O suporte a toque (long-press) também é nativo, atendendo à decisão D3 do
 * PLAN-20260723-001.
 */

/** Tipo único de arraste: só movemos itens para pastas. */
export const DND_TYPE_ITEM = 'ITEM';

/** Prefixo dos droppables que representam pastas. */
const FOLDER_PREFIX = 'folder:';

/** Droppable da lista de origem (não é alvo de soltura). */
export const DROPPABLE_LIST = 'list';

/** Pasta raiz — soltar aqui remove o item de qualquer pasta. */
export const DROPPABLE_ROOT = `${FOLDER_PREFIX}__root__`;

/**
 * Id do droppable de uma pasta.
 * @param {string} folderId
 * @returns {string}
 */
export function folderDroppableId(folderId) {
  return `${FOLDER_PREFIX}${folderId}`;
}

/**
 * Converte um droppableId de destino no folderId correspondente.
 * @param {string} droppableId
 * @returns {{ isFolder: boolean, folderId: string|null }}
 *   `isFolder=false` quando o destino não é uma pasta (ex.: a própria lista).
 *   `folderId=null` representa a raiz (sem pasta).
 */
export function parseFolderDroppableId(droppableId) {
  if (!droppableId || !droppableId.startsWith(FOLDER_PREFIX)) {
    return { isFolder: false, folderId: null };
  }

  if (droppableId === DROPPABLE_ROOT) {
    return { isFolder: true, folderId: null };
  }

  return { isFolder: true, folderId: droppableId.slice(FOLDER_PREFIX.length) };
}
