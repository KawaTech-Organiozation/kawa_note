import { z } from 'zod';

const colorEnum = z.enum(['slate', 'blue', 'purple', 'green', 'amber', 'red', 'pink']);
// Keeps Cofre (credential) folders and Notes folders in separate namespaces.
const scopeEnum = z.enum(['note', 'vault']);

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  parentFolderId: z.string().uuid().optional().nullable(),
  color: colorEnum.default('slate'),
  icon: z.string().default('folder'),
  order: z.number().int().default(0),
  scope: scopeEnum.default('note')
});

// Resolve/create a whole set of folder paths ("Work/Email") in one request,
// used by the credential import so it does not POST one folder at a time.
export const bulkFolderPathsSchema = z.object({
  paths: z.array(z.string().min(1)).max(500, 'At most 500 paths per request'),
  scope: scopeEnum.default('vault')
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).optional(),
  parentFolderId: z.string().uuid().optional().nullable(),
  color: colorEnum.optional(),
  icon: z.string().optional(),
  order: z.number().int().optional()
});

export const folderIdParamSchema = z.object({
  id: z.string().uuid('Invalid folder ID')
});

export const listFoldersQuerySchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  scope: scopeEnum.optional()
});

export const folderHierarchyQuerySchema = z.object({
  scope: scopeEnum.optional()
});
