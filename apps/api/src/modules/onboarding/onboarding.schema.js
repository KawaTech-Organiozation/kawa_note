import { z } from 'zod';
import { normalizePhone } from '../../utils/normalizers.js';

/**
 * Schema for creating user credentials (STEP 2)
 * Public endpoint — user does not exist yet.
 * Requires tenantId to associate the new user to the correct tenant.
 */
export const createUserCredentialsSchema = z.object({
  tenantId: z.string().uuid('tenantId inválido'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string()
    .transform((val) => {
      if (!val) return '';
      try {
        return normalizePhone(val);
      } catch (e) {
        return val;
      }
    })
    .refine((val) => val && (val.length === 10 || val.length === 11), 'Telefone deve ter 10 ou 11 dígitos'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

/**
 * Schema for selecting plan (STEP 3)
 */
export const selectPlanSchema = z.object({
  planName: z.enum(['FREE', 'STARTER', 'PRO'], {
    errorMap: () => ({ message: 'Plano inválido' })
  })
});
