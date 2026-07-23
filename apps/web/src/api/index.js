// API Client
export { apiClient, authApi, notesApi, foldersApi, relationsApi, appsApi } from './client';

// Hooks - Auth
export {
  useCurrentUser,
  useLogin,
  useLogout,
  useRefreshToken
} from './useAuth';

// Hooks - Notes
export {
  useNotes,
  useNote,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useSearchNotes
} from './useNotes';

// Hooks - Folders
export {
  useFolders,
  useFolderHierarchy,
  useFolder,
  useFolderNotes,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder
} from './useFolders';

// Hooks - Relations
export {
  useRelations,
  useRelatedNotes,
  useRelationGraph,
  useCreateRelation,
  useUpdateRelation,
  useDeleteRelation
} from './useRelations';
