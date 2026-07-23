import { z } from 'zod';

const relationTypeEnum = z.enum(['semantic', 'semantic_suggested', 'manual', 'reference', 'temporal']);

export const createRelationSchema = z.object({
  noteFromId: z.string().uuid('Invalid source note ID'),
  noteToId: z.string().uuid('Invalid target note ID'),
  relationType: relationTypeEnum.default('semantic'),
  strength: z.number().min(0).max(1).default(0.5),
  context: z.string().optional().nullable()
});

export const updateRelationSchema = z.object({
  relationType: relationTypeEnum.optional(),
  strength: z.number().min(0).max(1).optional(),
  context: z.string().optional().nullable()
});

export const relationIdParamSchema = z.object({
  id: z.string().uuid('Invalid relation ID')
});

export const noteIdParamSchema = z.object({
  id: z.string().uuid('Invalid note ID')
});
