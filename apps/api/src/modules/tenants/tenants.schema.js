import { z } from 'zod';
import { normalizeDocument, normalizePhone, normalizeCEP } from '../../utils/normalizers.js';

/**
 * Validates CPF format and algorithm
 * @param {string} cpf - CPF string (11 digits)
 * @returns {boolean}
 */
function validateCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}

/**
 * Validates CNPJ format and algorithm
 * @param {string} cnpj - CNPJ string (14 digits)
 * @returns {boolean}
 */
function validateCNPJ(cnpj) {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Validates document based on tenant type
 * @param {string} document - Document string
 * @param {string} tenantType - FISICA or JURIDICA
 * @returns {boolean}
 */
function validateDocument(document, tenantType) {
  const cleaned = document.replace(/\D/g, '');
  
  if (tenantType === 'FISICA') {
    return validateCPF(cleaned);
  } else if (tenantType === 'JURIDICA') {
    return validateCNPJ(cleaned);
  }
  
  return false;
}

/**
 * Validates Brazilian state code
 * @param {string} state - State code (UF)
 * @returns {boolean}
 */
function validateState(state) {
  const validStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'TO'
  ];
  return validStates.includes(state.toUpperCase());
}

/**
 * Validates ZIP code format
 * @param {string} zipCode - ZIP code (XXXXX-XXX)
 * @returns {boolean}
 */
function validateZipCode(zipCode) {
  return /^\d{5}-\d{3}$/.test(zipCode);
}

// Export validation functions
export { validateCPF, validateCNPJ, validateDocument, validateState, validateZipCode };

/**
 * Create Tenant Schema
 */
export const createTenantSchema = z.object({
  tenantType: z.enum(['FISICA', 'JURIDICA'], {
    errorMap: () => ({ message: 'Tipo de tenant deve ser FISICA ou JURIDICA' })
  }),
  
  // PF fields
  fullName: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .optional(),
  
  // PJ fields
  tradeName: z.string()
    .min(3, 'Razão social deve ter pelo menos 3 caracteres')
    .optional(),
  
  document: z.string()
    .transform((val) => {
      try {
        return normalizeDocument(val);
      } catch (e) {
        return val;
      }
    })
    .refine(
      (doc) => doc.length === 11 || doc.length === 14,
      'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos'
    ),
  
  fiscalNumber: z.string().optional(),
  
  // Responsible (PJ)
  responsibleName: z.string()
    .min(3, 'Nome do responsável deve ter pelo menos 3 caracteres')
    .optional(),
  
  responsiblePosition: z.string()
    .min(2, 'Cargo deve ter pelo menos 2 caracteres')
    .optional(),
  
  // Contact
  phone: z.string()
    .transform((val) => {
      if (!val) return '';
      try {
        return normalizePhone(val);
      } catch (e) {
        return val;
      }
    })
    .optional(),
  mobilePhone: z.string()
    .transform((val) => {
      if (!val) return '';
      try {
        return normalizePhone(val);
      } catch (e) {
        return val;
      }
    })
    .optional(),
  email: z.string()
    .email('Email inválido')
    .optional(),
  website: z.string()
    .url('URL inválida')
    .optional()
    .or(z.literal('')),
  
  // Address
  street: z.string()
    .min(3, 'Rua deve ter pelo menos 3 caracteres'),
  
  number: z.string()
    .min(1, 'Número é obrigatório'),
  
  complement: z.string().optional(),
  
  district: z.string()
    .min(2, 'Bairro deve ter pelo menos 2 caracteres'),
  
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres'),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .refine(validateState, 'Estado inválido'),
  
  zipCode: z.string()
    .transform((val) => {
      try {
        return normalizeCEP(val);
      } catch (e) {
        return val;
      }
    })
    .refine((val) => val.length === 8, 'CEP deve ter 8 dígitos')
}).refine(
  (data) => {
    if (data.tenantType === 'FISICA') {
      return data.fullName && validateDocument(data.document, 'FISICA');
    }
    if (data.tenantType === 'JURIDICA') {
      return data.tradeName && validateDocument(data.document, 'JURIDICA');
    }
    return false;
  },
  {
    message: 'Documento inválido para o tipo de tenant',
    path: ['document']
  }
);

/**
 * Update Tenant Schema
 */
export const updateTenantSchema = createTenantSchema;
