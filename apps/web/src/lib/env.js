import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente do frontend
 * Garante que todas as variáveis VITE_* necessárias estão presentes e válidas
 */
const envSchema = z.object({
  VITE_APP_NAME: z.string().min(1, 'VITE_APP_NAME é obrigatório'),
  VITE_KAWA_APP_ID: z.string().min(1, 'VITE_KAWA_APP_ID é obrigatório'),
  VITE_KAWA_FUNCTIONS_VERSION: z.string().min(1, 'VITE_KAWA_FUNCTIONS_VERSION é obrigatório'),
  VITE_KAWA_APP_BASE_URL: z.string().url('VITE_KAWA_APP_BASE_URL deve ser uma URL válida').optional(),
});

/**
 * Valida e retorna as variáveis de ambiente
 * @returns {Object} Objeto com variáveis de ambiente validadas
 * @throws {Error} Se alguma variável obrigatória estiver faltando ou inválida
 */
export function validateEnv() {
  const env = {
    VITE_APP_NAME: import.meta.env.VITE_APP_NAME,
    VITE_KAWA_APP_ID: import.meta.env.VITE_KAWA_APP_ID,
    VITE_KAWA_FUNCTIONS_VERSION: import.meta.env.VITE_KAWA_FUNCTIONS_VERSION,
    VITE_KAWA_APP_BASE_URL: import.meta.env.VITE_KAWA_APP_BASE_URL,
  };

  try {
    const validated = envSchema.parse(env);
    console.log('✅ Variáveis de ambiente validadas com sucesso');
    return validated;
  } catch (error) {
    console.error('❌ Erro ao validar variáveis de ambiente:', error.errors);
    throw new Error(
      `Configuração inválida: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    );
  }
}

// Validar e exportar variáveis de ambiente
export const appEnv = validateEnv();
