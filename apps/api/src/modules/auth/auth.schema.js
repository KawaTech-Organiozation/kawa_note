import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const encryptionSaltSchema = z.object({
  encryptionSalt: z.string().min(1, 'Encryption salt is required'),
  encryptionVerifier: z.string().min(1, 'Encryption verifier is required')
});
