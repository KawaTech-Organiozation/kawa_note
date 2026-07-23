/**
 * Zod schemas reutilizáveis para validação
 */
import { z } from 'zod';

// Validação de CPF (algoritmo de dígito verificador)
const validateCPF = (cpf) => {
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // Todos dígitos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Validação de CNPJ (algoritmo de dígito verificador)
const validateCNPJ = (cnpj) => {
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Schemas exportados
export const cpfSchema = z
  .string()
  .superRefine((val, ctx) => {
    // Normaliza: remove qualquer caractere não-numérico (mascara residual, pontos, traços)
    const digits = (val || '').replace(/\D/g, '');

    // Campo obrigatório
    if (digits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF é obrigatório',
      });
      return;
    }

    // Validação de tamanho (apenas dígitos)
    if (digits.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF deve ter 11 dígitos',
      });
      return;
    }

    // Validação de CPF válido (algoritmo)
    if (!validateCPF(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF inválido',
      });
    }
  });

export const cnpjSchema = z
  .string()
  .superRefine((val, ctx) => {
    // Normaliza: remove qualquer caractere não-numérico (mascara residual, pontos, barras, traços)
    const digits = (val || '').replace(/\D/g, '');

    // Campo obrigatório
    if (digits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ é obrigatório',
      });
      return;
    }

    // Validação de tamanho (apenas dígitos)
    if (digits.length !== 14) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ deve ter 14 dígitos',
      });
      return;
    }

    // Validação de CNPJ válido (algoritmo)
    if (!validateCNPJ(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ inválido',
      });
    }
  });

export const phoneSchema = z
  .string()
  .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos');

export const cepSchema = z
  .string()
  .superRefine((val, ctx) => {
    // Normaliza: remove qualquer caractere não-numérico (hífen da máscara)
    const digits = (val || '').replace(/\D/g, '');

    if (digits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CEP é obrigatório',
      });
      return;
    }

    if (digits.length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CEP deve ter 8 dígitos',
      });
    }
  });

export const emailSchema = z
  .string()
  .email('Email inválido');

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:mm');

export const dateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'Data-hora deve estar no formato ISO');
