import dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL').refine(
    (url) => !url.includes('localhost') || process.env.NODE_ENV !== 'production',
    'DATABASE_URL cannot use localhost in production'
  ),
  JWT_SECRET: z.string()
    .min(43, 'JWT_SECRET must be at least 43 characters (256 bits base64). Generate with: openssl rand -base64 43')
    .refine(
      (secret) => {
        // Warn if secret looks weak (all same char, sequential, etc)
        if (process.env.NODE_ENV === 'development') {
          const isWeak = /^(.)\1+$/.test(secret) || /^(0123456789|abcdefghij)/.test(secret);
          if (isWeak) {
            logger.warn({ secret: secret.substring(0, 10) + '...' }, 'JWT_SECRET appears weak. Use: openssl rand -base64 43');
          }
        }
        return true;
      }
    ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  logger.error({ errors: parsedEnv.error.errors }, 'Environment validation failed');
  parsedEnv.error.errors.forEach(err => {
    logger.error({ path: err.path, message: err.message }, 'Validation error');
  });
  process.exit(1);
}

export const env = parsedEnv.data;
