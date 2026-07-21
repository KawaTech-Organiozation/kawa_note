import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from './client';
import { encryptNoteData, decryptNoteData } from './useNotes';
import { checkAndHandleEncryptionError } from '@/lib/errorHandlers';
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

// Vault lists are loaded fully (client-side search/filter, like notes).
const VAULT_PAGE_LIMIT = 100;

/**
 * Fetch all credential entries (decrypted) for the current user.
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export const useVaultEntries = () => {
  return useQuery({
    queryKey: [VAULT_QUERY_KEY, 'list'],
    queryFn: async () => {
      // Page through type=password notes and decrypt client-side.
      const first = await notesApi.list({ page: 1, limit: VAULT_PAGE_LIMIT, type: CREDENTIAL_NOTE_TYPE });
      const total = first.pagination?.total ?? first.data?.length ?? 0;
      const totalPages = first.pagination?.totalPages ?? 1;

      let rows = [...(first.data || [])];
      for (let page = 2; page <= totalPages; page++) {
        // eslint-disable-next-line no-await-in-loop
        const res = await notesApi.list({ page, limit: VAULT_PAGE_LIMIT, type: CREDENTIAL_NOTE_TYPE });
        rows = rows.concat(res.data || []);
      }

      const entries = await Promise.all(
        rows.map(async (note) => noteToCredential(await decryptNoteData(note)))
      );

      return { data: entries, total };
    },
    staleTime: 1000 * 60 * 5
  });
};

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
