/**
 * Cliente do worker de decriptação do Cofre (PLAN-20260723-001, Etapa 5).
 *
 * Encapsula o ciclo de vida do Worker e o pareamento requisição/resposta.
 * Se o ambiente não suportar Worker (ou o import falhar — por exemplo em
 * jsdom durante os testes), `decryptBatch` devolve `null` e o chamador deve
 * cair no caminho síncrono já existente.
 */

let worker = null;
let workerUnavailable = false;
let nextRequestId = 1;

/** @returns {Worker|null} */
function getWorker() {
  if (workerUnavailable) return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL('../workers/decryptVault.worker.js', import.meta.url), {
      type: 'module'
    });
    return worker;
  } catch {
    workerUnavailable = true;
    return null;
  }
}

/**
 * Decripta um lote de notas fora do thread principal.
 *
 * @param {Array<{id: string, title: string, content: string, isEncrypted: boolean}>} notes
 * @param {CryptoKey} key - Chave AES-GCM (não extraível; trafega por structured clone)
 * @returns {Promise<Array<{id: string, title: string, content: string, failed?: boolean}>|null>}
 *   `null` quando não há worker disponível.
 */
export function decryptBatch(notes, key) {
  const activeWorker = getWorker();
  if (!activeWorker) return Promise.resolve(null);

  const id = nextRequestId++;

  return new Promise((resolve) => {
    const onMessage = (event) => {
      if (event.data?.id !== id) return;
      activeWorker.removeEventListener('message', onMessage);
      resolve(event.data.results);
    };

    const onError = () => {
      activeWorker.removeEventListener('message', onMessage);
      activeWorker.removeEventListener('error', onError);
      workerUnavailable = true;
      resolve(null);
    };

    activeWorker.addEventListener('message', onMessage);
    activeWorker.addEventListener('error', onError, { once: true });

    activeWorker.postMessage({ id, key, notes });
  });
}

/** Encerra o worker (logout / troca de conta). */
export function terminateDecryptPool() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  workerUnavailable = false;
}
