import { z } from 'zod';

export const createShareSchema = z.object({
  folderNameSnapshot: z.string().min(1).max(255),
  ciphertext: z.string().min(1).max(5_000_000),
  iv: z.string().min(1).max(128),
  expiresAt: z.string().datetime({ offset: true }),
  maxViews: z.number().int().min(1).max(100)
});

export const shareIdParamSchema = z.object({ id: z.string().uuid() });
