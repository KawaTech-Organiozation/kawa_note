/**
 * Web Worker de decriptação em lote do Cofre (PLAN-20260723-001, Etapa 5).
 *
 * Por que existe: decriptar milhares de credenciais no thread principal trava a
 * UI. AES-GCM é CPU-bound e não há I/O envolvido, então mover o laço para um
 * worker devolve a responsividade da tela.
 *
 * Sobre a chave: um `CryptoKey` é structured-cloneable, então a chave derivada
 * pode ser enviada por `postMessage` sem ser exportada. Ela continua
 * `extractable: false` — nem o worker consegue lê-la em claro. Nenhum material
 * de chave trafega, apenas a referência opaca.
 *
 * Protocolo:
 *   → { id, key, notes: [{ id, title, content, tags, isEncrypted }] }
 *   ← { id, results: [{ id, title, content, tags, failed? }] }
 */

const IV_LENGTH = 12; // 96 bits (padrão GCM), igual a src/lib/crypto.js

/**
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decripta um campo no formato base64(iv + ciphertext + authTag).
 * @param {string} ciphertextBase64
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
async function decryptField(ciphertextBase64, key) {
  if (!ciphertextBase64) return '';

  const combined = base64ToBytes(ciphertextBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

self.onmessage = async (event) => {
  const { id, key, notes } = event.data || {};

  if (!key || !Array.isArray(notes)) {
    self.postMessage({ id, results: [] });
    return;
  }

  const results = [];

  for (const note of notes) {
    // Nota legada em texto puro: nada a fazer.
    if (!note.isEncrypted) {
      results.push({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: Array.isArray(note.tags) ? note.tags : []
      });
      continue;
    }

    try {
      const [title, content, tagsRaw] = await Promise.all([
        decryptField(note.title, key),
        decryptField(note.content, key),
        // `tags` é um array JSON cifrado (mesmo formato de decryptJSON).
        note.tags ? decryptField(note.tags, key) : Promise.resolve('')
      ]);

      let tags = [];
      if (tagsRaw) {
        try {
          const parsed = JSON.parse(tagsRaw);
          if (Array.isArray(parsed)) tags = parsed;
        } catch {
          tags = [];
        }
      }

      results.push({ id: note.id, title, content, tags });
    } catch {
      // Uma linha corrompida não pode derrubar o lote inteiro; o chamador
      // decide como apresentar a falha.
      results.push({ id: note.id, title: '', content: '', tags: [], failed: true });
    }
  }

  self.postMessage({ id, results });
};
