import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tenantsService } from '../tenants.service.js';
import { prisma } from '../../../config/database.js';

vi.mock('../../../config/database.js');

describe('TenantsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTenant', () => {
    it('should create a tenant with valid PF data', async () => {
      const pfData = {
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '12345678901',
        phone: '1133334444',
        mobilePhone: '11999998888',
        email: 'joao@example.com',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      const createdTenant = {
        tenantId: 'uuid-1',
        ...pfData,
        onboardingStep: 'STEP_1',
        onboardingStatus: 'IN_PROGRESS',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(createdTenant);

      const result = await tenantsService.createTenant(pfData);

      expect(result.tenantId).toBe('uuid-1');
      expect(result.onboardingStep).toBe('STEP_1');
      expect(result.onboardingStatus).toBe('IN_PROGRESS');
      expect(result.isActive).toBe(false);
      expect(prisma.tenant.create).toHaveBeenCalled();
    });

    it('should create a tenant with valid PJ data', async () => {
      const pjData = {
        tenantType: 'JURIDICA',
        tradeName: 'Empresa LTDA',
        document: '12345678901234',
        fiscalNumber: '12345678901234',
        responsibleName: 'João Silva',
        responsiblePosition: 'Diretor',
        phone: '1133334444',
        mobilePhone: '11999998888',
        email: 'empresa@example.com',
        website: 'https://example.com',
        street: 'Rua B',
        number: '456',
        district: 'Bairro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      const createdTenant = {
        tenantId: 'uuid-2',
        ...pjData,
        fullName: '',
        onboardingStep: 'STEP_1',
        onboardingStatus: 'IN_PROGRESS',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(createdTenant);

      const result = await tenantsService.createTenant(pjData);

      expect(result.tenantId).toBe('uuid-2');
      expect(result.onboardingStep).toBe('STEP_1');
      expect(result.onboardingStatus).toBe('IN_PROGRESS');
      expect(result.isActive).toBe(false);
    });

    it('should throw error for duplicate document', async () => {
      const pfData = {
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '12345678901',
        phone: '1133334444',
        mobilePhone: '11999998888',
        email: 'joao@example.com',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      prisma.tenant.findUnique.mockResolvedValue({ tenantId: 'existing' });

      await expect(tenantsService.createTenant(pfData)).rejects.toThrow('Documento já cadastrado');
    });

    it('should throw error for invalid CPF', async () => {
      const invalidData = {
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '00000000000',
        phone: '1133334444',
        mobilePhone: '11999998888',
        email: 'joao@example.com',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      await expect(tenantsService.createTenant(invalidData)).rejects.toThrow();
    });

    it('should throw error for invalid CNPJ', async () => {
      const invalidData = {
        tenantType: 'JURIDICA',
        tradeName: 'Empresa LTDA',
        document: '00000000000000',
        responsibleName: 'João Silva',
        responsiblePosition: 'Diretor',
        email: 'empresa@example.com',
        street: 'Rua B',
        number: '456',
        district: 'Bairro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      await expect(tenantsService.createTenant(invalidData)).rejects.toThrow();
    });
  });

  describe('updateTenant', () => {
    it('should update an existing tenant', async () => {
      const tenantId = 'uuid-1';
      const updateData = {
        tenantType: 'FISICA',
        fullName: 'João Silva Updated',
        document: '12345678901',
        phone: '1133334444',
        mobilePhone: '11999998888',
        email: 'joao.updated@example.com',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      const existingTenant = {
        tenantId,
        ...updateData,
        onboardingStep: 'STEP_1',
        onboardingStatus: 'IN_PROGRESS',
        isActive: false
      };

      const updatedTenant = {
        ...existingTenant,
        fullName: 'João Silva Updated',
        email: 'joao.updated@example.com'
      };

      prisma.tenant.findUnique.mockResolvedValue(existingTenant);
      prisma.tenant.update.mockResolvedValue(updatedTenant);

      const result = await tenantsService.updateTenant(tenantId, updateData);

      expect(result.fullName).toBe('João Silva Updated');
      expect(prisma.tenant.update).toHaveBeenCalled();
    });

    it('should throw error if tenant not found', async () => {
      const tenantId = 'non-existent';
      const updateData = {
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '12345678901',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(tenantsService.updateTenant(tenantId, updateData)).rejects.toThrow('Tenant não encontrado');
    });

    it('should throw error for duplicate document on update', async () => {
      const tenantId = 'uuid-1';
      const updateData = {
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '98765432101',
        street: 'Rua A',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100'
      };

      const existingTenant = {
        tenantId,
        document: '12345678901',
        fullName: 'João Silva'
      };

      prisma.tenant.findUnique
        .mockResolvedValueOnce(existingTenant)
        .mockResolvedValueOnce({ tenantId: 'other-tenant' });

      await expect(tenantsService.updateTenant(tenantId, updateData)).rejects.toThrow('Documento já cadastrado');
    });
  });

  describe('getTenant', () => {
    it('should get a tenant by ID', async () => {
      const tenantId = 'uuid-1';
      const tenant = {
        tenantId,
        tenantType: 'FISICA',
        fullName: 'João Silva',
        document: '12345678901',
        onboardingStep: 'STEP_1',
        onboardingStatus: 'IN_PROGRESS',
        isActive: false
      };

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await tenantsService.getTenant(tenantId);

      expect(result.tenantId).toBe(tenantId);
      expect(result.fullName).toBe('João Silva');
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { tenantId } });
    });

    it('should throw error if tenant not found', async () => {
      const tenantId = 'non-existent';

      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(tenantsService.getTenant(tenantId)).rejects.toThrow('Tenant não encontrado');
    });
  });

  describe('getTenantByDocument', () => {
    it('should get a tenant by document', async () => {
      const document = '12345678901';
      const tenant = {
        tenantId: 'uuid-1',
        document,
        fullName: 'João Silva'
      };

      prisma.tenant.findUnique.mockResolvedValue(tenant);

      const result = await tenantsService.getTenantByDocument(document);

      expect(result.document).toBe(document);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({ where: { document } });
    });

    it('should return null if tenant not found', async () => {
      const document = '00000000000';

      prisma.tenant.findUnique.mockResolvedValue(null);

      const result = await tenantsService.getTenantByDocument(document);

      expect(result).toBeNull();
    });
  });

  describe('validateDocument', () => {
    it('should validate CPF correctly', () => {
      const validCPF = '12345678901';
      const result = tenantsService.validateDocument(validCPF, 'FISICA');
      expect(typeof result).toBe('boolean');
    });

    it('should validate CNPJ correctly', () => {
      const validCNPJ = '12345678901234';
      const result = tenantsService.validateDocument(validCNPJ, 'JURIDICA');
      expect(typeof result).toBe('boolean');
    });
  });
});
