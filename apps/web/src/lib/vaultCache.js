/**
 * Cache local do Cofre (PLAN-20260723-001, Etapa 5).
 *
 * SEGURANÇA — invariante central deste módulo:
 * o que é persistido aqui é **exclusivamente o texto cifrado** devolvido pela
 * API. Nada decriptado toca o disco, e a chave de criptografia continua
 * existindo apenas em memória (`src/lib/keyManager.js`). Se algum dia for
 * preciso guardar um campo decriptado, este módulo é o lugar errado.
 *
 * Motivação: a listagem da API tem teto de 100 itens por página, então um cofre
 * grande exigia dezenas de requisições sequenciais a cada abertura da tela.
 * Guardando o ciphertext localmente, a segunda abertura em diante só busca o
 * delta (`updatedAt > último visto`).
 */

const DB_NAME = 'kawa-vault-cache';
const DB_VERSION = 1;
const STORE_NOTES = 'ciphertext';
const STORE_META = 'meta';

/** Chave do cursor de sincronização dentro do store de metadados. */
const META_LAST_SYNC = 'lastSyncedAt';

let dbPromise = null;

/**
 * Abre (e cria, se preciso) o banco local.
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/**
 * Promisifica uma IDBRequest.
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function toPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Lê todas as notas cifradas em cache.
 * @returns {Promise<Array>} Registros como vieram da API (ainda cifrados)
 */
export async function readCachedNotes() {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NOTES, 'readonly');
    return await toPromise(tx.objectStore(STORE_NOTES).getAll());
  } catch {
    // Cache é otimização, nunca fonte de verdade: falhar aqui só significa
    // que a próxima sincronização será completa.
    return [];
  }
}

/**
 * Cursor da última sincronização bem-sucedida.
 * @returns {Promise<string|null>} ISO 8601, ou null se nunca sincronizou
 */
export async function readLastSyncedAt() {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_META, 'readonly');
    return (await toPromise(tx.objectStore(STORE_META).get(META_LAST_SYNC))) ?? null;
  } catch {
    return null;
  }
}

/**
 * Aplica um lote do delta ao cache: grava/atualiza os vivos e remove os
 * apagados (soft delete chega com `deletedAt` preenchido).
 * @param {Array} notes - Registros cifrados vindos de /notes/sync
 * @param {string|null} lastSyncedAt - Novo cursor a persistir
 * @returns {Promise<void>}
 */
export async function applyCachedDelta(notes, lastSyncedAt) {
  if (!notes.length && !lastSyncedAt) return;

  try {
    const db = await openDb();
    const tx = db.transaction([STORE_NOTES, STORE_META], 'readwrite');
    const store = tx.objectStore(STORE_NOTES);

    for (const note of notes) {
      if (note.deletedAt) {
        store.delete(note.id);
      } else {
        store.put(note);
      }
    }

    if (lastSyncedAt) {
      tx.objectStore(STORE_META).put(lastSyncedAt, META_LAST_SYNC);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch {
    // Silencioso pelo mesmo motivo de readCachedNotes.
  }
}

/**
 * Descarta o cache inteiro. Deve ser chamado no logout — o ciphertext é do
 * usuário que estava logado e não deve sobreviver à troca de conta.
 * @returns {Promise<void>}
 */
export async function clearVaultCache() {
  try {
    const db = await openDb();
    const tx = db.transaction([STORE_NOTES, STORE_META], 'readwrite');
    tx.objectStore(STORE_NOTES).clear();
    tx.objectStore(STORE_META).clear();
    await new Promise((resolve) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => resolve(undefined);
    });
  } catch {
    // idem
  }
}
