import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersApi } from './client';
import { clearVaultCache } from '@/lib/vaultCache';

/** @typedef {import('@/types/models').Folder} Folder */
/** @typedef {import('@/types/api').ApiSuccessResponse} ApiSuccessResponse */

const FOLDERS_QUERY_KEY = 'folders';
const NOTES_QUERY_KEY = 'notes';

/**
 * Hook to fetch folders list
 * @param {string} [parentId] - Parent folder ID
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Folder[]>>}
 */
export const useFolders = (parentId = null) => {
  return useQuery({
    queryKey: [FOLDERS_QUERY_KEY, parentId],
    queryFn: () => foldersApi.list(parentId),
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Hook to fetch folder hierarchy (tree structure)
 * @param {'note'|'vault'} [scope] - folder namespace; defaults to Notes folders
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Folder[]>>}
 */
export const useFolderHierarchy = (scope = 'note') => {
  return useQuery({
    queryKey: [FOLDERS_QUERY_KEY, 'hierarchy', scope],
    queryFn: () => foldersApi.hierarchy(scope),
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Hook to fetch a single folder by ID
 * @param {string} id - Folder ID
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<Folder>>}
 */
export const useFolder = (id) => {
  return useQuery({
    queryKey: [FOLDERS_QUERY_KEY, id],
    queryFn: () => foldersApi.get(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Hook to fetch notes within a folder
 * @param {string} folderId - Folder ID
 * @param {Object} params - Query parameters
 * @returns {import('@tanstack/react-query').UseQueryResult<ApiSuccessResponse<import('@/types/models').Note[]>>}
 */
export const useFolderNotes = (folderId, params = {}) => {
  return useQuery({
    queryKey: [FOLDERS_QUERY_KEY, folderId, 'notes', params],
    queryFn: () => foldersApi.getNotes(folderId, params),
    enabled: !!folderId,
    staleTime: 1000 * 60 * 5
  });
};

/**
 * Hook to create a new folder
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<Folder>, Error, Folder>}
 */
export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (folderData) => foldersApi.create(folderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.refetchQueries({ queryKey: [FOLDERS_QUERY_KEY], type: 'active' });
    }
  });
};

/**
 * Hook to update an existing folder
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<Folder>, Error, {id: string, data: Partial<Folder>}>}
 */
export const useUpdateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => foldersApi.update(id, data),
    onSuccess: async (_, variables) => {
      // O cache local do Cofre embute nome/cor da pasta em cada credencial, e
      // renomear a pasta não altera o `updatedAt` das notas — o delta não traria
      // a correção. Descartar o cache força um resync completo.
      await clearVaultCache();
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      queryClient.refetchQueries({ queryKey: [FOLDERS_QUERY_KEY], type: 'active' });
    }
  });
};

/**
 * Hook to delete a folder
 * @returns {import('@tanstack/react-query').UseMutationResult<ApiSuccessResponse<void>, Error, string>}
 */
export const useDeleteFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => foldersApi.delete(id),
    onSuccess: async () => {
      // Mesmo motivo do update: o cache do Cofre carrega dados da pasta.
      await clearVaultCache();
      queryClient.invalidateQueries({ queryKey: [FOLDERS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      queryClient.refetchQueries({ queryKey: [FOLDERS_QUERY_KEY], type: 'active' });
    }
  });
};
