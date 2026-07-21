import { z } from 'zod';

const noteTypeEnum = z.enum(['text', 'url', 'image', 'word', 'password']);

export const createNoteSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: noteTypeEnum.default('text'),
  url: z.string().url().optional().nullable(),
  previewData: z.string().optional().nullable(), // Now encrypted string
  tags: z.string().default(''), // Now encrypted string
  context: z.string().optional().nullable(),
  metadataStatus: z.enum(['idle', 'queued', 'processing', 'ready', 'failed']).optional(),
  isEncrypted: z.boolean().default(true),
  pinned: z.boolean().default(false),
  folderId: z.string().uuid().optional().nullable()
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  type: noteTypeEnum.optional(),
  url: z.string().url().optional().nullable(),
  previewData: z.string().optional().nullable(), // Now encrypted string
  tags: z.string().optional(), // Now encrypted string
  context: z.string().optional().nullable(),
  metadataStatus: z.enum(['idle', 'queued', 'processing', 'ready', 'failed']).optional(),
  isEncrypted: z.boolean().optional(),
  pinned: z.boolean().optional(),
  folderId: z.string().uuid().optional().nullable()
});

export const listNotesQuerySchema = z.object({
  page: z.string()
    .transform(Number)
    .refine(val => val >= 1, 'Page must be >= 1')
    .default('1'),
  limit: z.string()
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100')
    .default('20'),
  folderId: z.string().uuid().optional(),
  search: z.string()
    .max(100, 'Search query must not exceed 100 characters')
    .optional(),
  tags: z.string()
    .max(100, 'Tags parameter must not exceed 100 characters')
    .optional(),
  pinned: z.string().transform(val => val === 'true').optional(),
  // Filter notes by type (e.g. 'password' for the Vault/Cofre view)
  type: noteTypeEnum.optional(),
  // Exclude a type from the result (e.g. exclude 'password' from the Notes view)
  excludeType: noteTypeEnum.optional()
});

export const noteIdParamSchema = z.object({
  id: z.string().uuid('Invalid note ID')
});
