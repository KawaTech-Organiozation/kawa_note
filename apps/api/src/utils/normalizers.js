/**
 * Utilitários de normalização backend
 */

/**
 * Remove todos os caracteres não-dígitos
 */
export const unmaskDigits = (value) => {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Normaliza telefone (10-11 dígitos)
 */
export const normalizePhone = (value) => {
  const clean = unmaskDigits(value);
  if (clean.length < 10 || clean.length > 11) {
    throw new Error('Telefone deve ter 10 ou 11 dígitos');
  }
  return clean;
};

/**
 * Normaliza CEP (8 dígitos)
 */
export const normalizeCEP = (value) => {
  const clean = unmaskDigits(value);
  if (clean.length !== 8) {
    throw new Error('CEP deve ter 8 dígitos');
  }
  return clean;
};

/**
 * Normaliza documento (CPF ou CNPJ)
 */
export const normalizeDocument = (value, type = 'auto') => {
  const clean = unmaskDigits(value);
  
  if (type === 'auto') {
    if (clean.length === 11) return clean; // CPF
    if (clean.length === 14) return clean; // CNPJ
    throw new Error('Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos');
  }
  
  if (type === 'cpf' && clean.length !== 11) {
    throw new Error('CPF deve ter 11 dígitos');
  }
  
  if (type === 'cnpj' && clean.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos');
  }
  
  return clean;
};
