/**
 * Credential Codec
 *
 * A "Cofre de Senha" credential is stored as a Note with `type === 'password'`.
 * The secret fields (username, password, url, notes) are serialized into the
 * note's `content` field, which is already end-to-end encrypted by the notes
 * pipeline (see `src/api/useNotes.js` -> encryptNoteData). This keeps the whole
 * credential zero-knowledge without any database migration.
 *
 * IMPORTANT: the credential URL lives INSIDE `content` (encrypted), never in the
 * note's plaintext `url` column — so the site a credential belongs to is never
 * exposed to the server, and arbitrary/invalid URLs from imports don't fail the
 * backend's `z.string().url()` validation.
 */

export const CREDENTIAL_NOTE_TYPE = 'password';

/**
 * @typedef {Object} Credential
 * @property {string} [username]
 * @property {string} [password]
 * @property {string} [url]
 * @property {string} [notes]
 */

/**
 * Serialize credential secret fields into the string stored in `note.content`.
 * @param {Credential} credential
 * @returns {string} JSON string (non-empty, satisfies the backend's content min(1))
 */
export function encodeCredentialContent({ username = '', password = '', url = '', notes = '' } = {}) {
  return JSON.stringify({
    v: 1,
    username: username ?? '',
    password: password ?? '',
    url: url ?? '',
    notes: notes ?? ''
  });
}

/**
 * Parse the decrypted `note.content` back into credential fields.
 * Tolerant of legacy/plain values: if the content isn't the expected JSON,
 * it's treated as the free-text notes.
 * @param {string} content - Decrypted note content
 * @returns {Credential}
 */
export function decodeCredentialContent(content) {
  const empty = { username: '', password: '', url: '', notes: '' };
  if (!content) return empty;

  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object') {
      return {
        username: parsed.username ?? '',
        password: parsed.password ?? '',
        url: parsed.url ?? '',
        notes: parsed.notes ?? ''
      };
    }
  } catch {
    // Not JSON — treat the whole string as notes (legacy / manual data)
    return { ...empty, notes: content };
  }

  return empty;
}

/**
 * Convert a decrypted credential Note into a flat view-model for the UI.
 * @param {Object} decryptedNote - Note already decrypted by decryptNoteData
 * @returns {Object} Credential entry view-model
 */
export function noteToCredential(decryptedNote) {
  const fields = decodeCredentialContent(decryptedNote.content);
  return {
    id: decryptedNote.id,
    title: decryptedNote.title || '',
    username: fields.username,
    password: fields.password,
    url: fields.url,
    notes: fields.notes,
    tags: Array.isArray(decryptedNote.tags) ? decryptedNote.tags : [],
    folderId: decryptedNote.folderId ?? null,
    folder: decryptedNote.folder ?? null,
    createdAt: decryptedNote.createdAt,
    updatedAt: decryptedNote.updatedAt
  };
}

/**
 * Build the (plaintext) note payload for a credential, ready to be handed to the
 * notes encryption pipeline. Secrets go into `content`; `url` column stays null.
 * @param {Credential & { title?: string, tags?: string[], folderId?: string|null }} credential
 * @returns {Object} Note payload (pre-encryption)
 */
export function credentialToNotePayload({ title = '', username, password, url, notes, tags = [], folderId = null } = {}) {
  return {
    title,
    content: encodeCredentialContent({ username, password, url, notes }),
    type: CREDENTIAL_NOTE_TYPE,
    url: null,
    tags: Array.isArray(tags) ? tags : [],
    folderId: folderId || null
  };
}
