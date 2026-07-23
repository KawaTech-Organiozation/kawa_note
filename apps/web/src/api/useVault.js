import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from './client';
import { encryptNoteData, decryptNoteData } from './useNotes';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';
import { getKey } from '@/lib/keyManager';
import { decryptBatch } from '@/lib/decryptPool';
import { readCachedNotes, readLastSyncedAt, applyCachedDelta } from '@/lib/vaultCache';
import {
  CREDENTIAL_NOTE_TYPE,
  credentialToNotePayload,
  noteToCredential
} from '@/lib/credentialCodec';

/**
 * Vault (Cofre de Senha) data layer.
 *
 * A credential is a Note with `type === 'password'`; secrets live inside the
 * already-E2E-encrypted `content`. These hooks reuse the notes encryption
 * pipeline (encryptNoteData / decryptNoteData) but deliberately DO NOT trigger
 * the notes' semantic-relation suggestions or `noteCreated` PWA event — a vault
 * should not cross-link credentials or behave like note authoring.
 */

const VAULT_QUERY_KEY = 'vault';
// Vault entries live in the notes table; keep note-derived caches/counts fresh.
const NOTES_QUERY_KEY = 'notes';
const FOLDERS_QUERY_KEY = 'folders';

// Página do endpoint de sync. Vai a 500 (contra o teto de 100 da listagem
// paginada), o que reduz a ida ao servidor em cofres grandes.
const VAULT_SYNC_LIMIT = 500;

/**
 * Fetch all credential entries (decrypted) for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export const useVaultEntries = () => {
  return useQuery({
    queryKey: [VAULT_QUERY_KEY, 'list'],
    queryFn: async () => {
      const rows = await loadCredentialRows();
      const entries = await decryptCredentialRows(rows);
      return { data: entries, total: entries.length };
    },
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Carrega as linhas cifradas do Cofre: cache local + delta do servidor.
 *
 * A listagem paginada tem teto de 100 por página, então um cofre grande custava
 * dezenas de requisições sequenciais a cada abertura. Com o cache, só o que
 * mudou desde o último acesso é buscado.
 *
 * @returns {Promise<Array>} Linhas ainda cifradas
 */
async function loadCredentialRows() {
  const cached = await readCachedNotes();
  const byId = new Map(cached.map((note) => [note.id, note]));

  let since = cached.length ? await readLastSyncedAt() : null;
  let cursor;
  let newest = since;
  const delta = [];

  // Páginas de 500 (contra 100 da listagem) e só o que mudou desde `since`.
  do {
    const response = await notesApi.sync({
      cursor,
      since: since ?? undefined,
      limit: VAULT_SYNC_LIMIT,
      type: CREDENTIAL_NOTE_TYPE
    });

    const page = response?.data?.data || [];
    delta.push(...page);

    for (const note of page) {
      if (note.deletedAt) byId.delete(note.id);
      else byId.set(note.id, note);
      if (!newest || note.updatedAt > newest) newest = note.updatedAt;
    }

    cursor = response?.data?.hasMore ? response.data.nextCursor : undefined;
  } while (cursor);

  await applyCachedDelta(delta, newest);

  return [...byId.values()];
}

/**
 * Decripta as linhas do Cofre, preferindo o Web Worker.
 *
 * O worker evita travar a UI em cofres grandes. Quando ele não está disponível
 * (ambiente sem Worker, ex.: testes em jsdom), cai no caminho síncrono original.
 *
 * @param {Array} rows - Linhas cifradas
 * @returns {Promise<Array>} Credenciais prontas para a UI
 */
async function decryptCredentialRows(rows) {
  const key = await getKey();

  if (key) {
    const decrypted = await decryptBatch(
      rows.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        isEncrypted: note.isEncrypted
      })),
      key
    );

    if (decrypted) {
      const byId = new Map(decrypted.map((item) => [item.id, item]));
      return rows.map((note) => {
        const plain = byId.get(note.id);
        return noteToCredential({
          ...note,
          title: plain?.title ?? note.title,
          content: plain?.content ?? '',
          tags: Array.isArray(plain?.tags) ? plain.tags : []
        });
      });
    }
  }

  // Fallback: pipeline síncrono já existente (também cobre a chave ausente,
  // devolvendo os placeholders de "login necessário").
  return Promise.all(rows.map(async (note) => noteToCredential(await decryptNoteData(note))));
}

function invalidateVault(queryClient) {
  queryClient.invalidateQueries({ queryKey: [VAULT_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
  queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
  queryClient.refetchQueries({ queryKey: [FOLDERS_QUERY_KEY], type: 'active' });
}

/**
 * Create a credential entry.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useCreateVaultEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credential) => {
      const payload = credentialToNotePayload(credential);
      const encrypted = await encryptNoteData(payload);
      // Ensure the type survives (encryptNoteData spreads the payload but the
      // credential type must be explicit for backend filtering/isolation).
      encrypted.type = CREDENTIAL_NOTE_TYPE;
      return notesApi.create(encrypted);
    },
    onSuccess: () => invalidateVault(queryClient),
    onError: (error) => {
      checkAndHandleEncryptionError(error);
    }
  });
};

/**
 * Update a credential entry.
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useUpdateVaultEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = credentialToNotePayload(data);
      const encrypted = await encryptNoteData(payload);
      encrypted.type = CREDENTIAL_NOTE_TYPE;
      return notesApi.update(id, encrypted);
    },
    onSuccess: () => invalidateVault(queryClient),
    onError: (error) => {
      checkAndHandleEncryptionError(error);
    }
  });
};

/**
 * Delete a credential entry (soft delete via the notes endpoint).
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export const useDeleteVaultEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notesApi.delete(id),
    onSuccess: () => invalidateVault(queryClient)
  });
};
