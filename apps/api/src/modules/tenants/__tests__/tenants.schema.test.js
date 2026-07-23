import { describe, it, expect } from 'vitest';
import { validateCPF, validateCNPJ, validateDocument, validateState, validateZipCode } from '../tenants.schema.js';

describe('Tenant Schema Validation', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      // Valid CPF: 11144477735
      expect(validateCPF('11144477735')).toBe(true);
      expect(validateCPF('111.444.777-35')).toBe(true);
    });

    it('should reject CPF with all same digits', () => {
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('00000000000')).toBe(false);
      expect(validateCPF('99999999999')).toBe(false);
    });

    it('should reject CPF with invalid length', () => {
      expect(validateCPF('123')).toBe(false);
      expect(validateCPF('123456789012')).toBe(false);
    });

    it('should reject CPF with invalid check digits', () => {
      expect(validateCPF('11144477736')).toBe(false);
      expect(validateCPF('11144477734')).toBe(false);
    });

    it('should handle formatted and unformatted CPF', () => {
      const validCPF = '11144477735';
      const formattedCPF = '111.444.777-35';
      expect(validateCPF(validCPF)).toBe(validateCPF(formattedCPF));
    });
  });

  describe('validateCNPJ', () => {
    it('should validate correct CNPJ', () => {
      // Valid CNPJ: 11222333000181
      expect(validateCNPJ('11222333000181')).toBe(true);
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('should reject CNPJ with all same digits', () => {
      expect(validateCNPJ('11111111111111')).toBe(false);
      expect(validateCNPJ('00000000000000')).toBe(false);
      expect(validateCNPJ('99999999999999')).toBe(false);
    });

    it('should reject CNPJ with invalid length', () => {
      expect(validateCNPJ('123')).toBe(false);
      expect(validateCNPJ('123456789012345')).toBe(false);
    });

    it('should reject CNPJ with invalid check digits', () => {
      expect(validateCNPJ('11222333000182')).toBe(false);
      expect(validateCNPJ('11222333000180')).toBe(false);
    });

    it('should handle formatted and unformatted CNPJ', () => {
      const validCNPJ = '11222333000181';
      const formattedCNPJ = '11.222.333/0001-81';
      expect(validateCNPJ(validCNPJ)).toBe(validateCNPJ(formattedCNPJ));
    });
  });

  describe('validateDocument', () => {
    it('should validate CPF for FISICA tenant', () => {
      expect(validateDocument('11144477735', 'FISICA')).toBe(true);
      expect(validateDocument('11111111111', 'FISICA')).toBe(false);
    });

    it('should validate CNPJ for JURIDICA tenant', () => {
      expect(validateDocument('11222333000181', 'JURIDICA')).toBe(true);
      expect(validateDocument('11111111111111', 'JURIDICA')).toBe(false);
    });

    it('should reject invalid tenant type', () => {
      expect(validateDocument('11144477735', 'INVALID')).toBe(false);
    });
  });

  describe('validateState', () => {
    it('should validate all Brazilian states', () => {
      const validStates = [
        'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
        'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
        'RS', 'RO', 'RR', 'SC', 'SP', 'TO'
      ];
      
      validStates.forEach(state => {
        expect(validateState(state)).toBe(true);
        expect(validateState(state.toLowerCase())).toBe(true);
      });
    });

    it('should reject invalid state codes', () => {
      expect(validateState('XX')).toBe(false);
      expect(validateState('ZZ')).toBe(false);
      expect(validateState('S')).toBe(false);
      expect(validateState('SPP')).toBe(false);
    });
  });

  describe('validateZipCode', () => {
    it('should validate correct ZIP code format', () => {
      expect(validateZipCode('01310100')).toBe(true);
      expect(validateZipCode('12345678')).toBe(true);
    });

    it('should reject invalid ZIP code format', () => {
      expect(validateZipCode('0131010')).toBe(false);
      expect(validateZipCode('013101000')).toBe(false);
      expect(validateZipCode('0131-0100')).toBe(false);
      expect(validateZipCode('ABCDEFGH')).toBe(false);
    });
  });
});
