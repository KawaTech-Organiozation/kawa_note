import { prisma } from '../../config/database.js';
import { createTenantSchema, updateTenantSchema, validateDocument } from './tenants.schema.js';

/**
 * Tenants Service
 * Handles business logic for tenant management
 */
export const tenantsService = {
  /**
   * Create a new tenant
   * @param {Object} data - Tenant data
   * @param {string} userId - Optional user ID to associate with tenant
   * @returns {Promise<Object>} Created tenant
   * @throws {Error} If validation fails or document already exists
   */
  async createTenant(data, userId) {
    // Validate input
    const validatedData = createTenantSchema.parse(data);
    
    // Check for duplicate document
    const existingTenant = await prisma.tenant.findUnique({
      where: { document: validatedData.document }
    });
    
    if (existingTenant) {
      const error = new Error('Documento já cadastrado');
      error.code = 'DUPLICATE_DOCUMENT';
      throw error;
    }
    
    // If userId provided, verify user doesn't already have a tenant
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        const error = new Error('Usuário não encontrado');
        error.code = 'USER_NOT_FOUND';
        throw error;
      }
      
      if (user.tenantId) {
        const error = new Error('Usuário já pertence a um tenant');
        error.code = 'USER_ALREADY_HAS_TENANT';
        throw error;
      }
    }
    
    // Create tenant + associate user in transaction
    const tenant = await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          tenantType: validatedData.tenantType,
          fullName: validatedData.fullName || '',
          tradeName: validatedData.tradeName,
          document: validatedData.document,
          fiscalNumber: validatedData.fiscalNumber,
          responsibleName: validatedData.responsibleName,
          responsiblePosition: validatedData.responsiblePosition,
          phone: validatedData.phone,
          mobilePhone: validatedData.mobilePhone,
          email: validatedData.email,
          website: validatedData.website,
          street: validatedData.street,
          number: validatedData.number,
          complement: validatedData.complement,
          district: validatedData.district,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          onboardingStep: 'STEP_1',
          onboardingStatus: 'IN_PROGRESS',
          isActive: false
        }
      });
      
      // Associate user with tenant if userId provided
      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: { tenantId: newTenant.tenantId }
        });
      }
      
      return newTenant;
    });
    
    return tenant;
  },
  
  /**
   * Update an existing tenant
   * @param {string} tenantId - Tenant ID
   * @param {Object} data - Tenant data to update
   * @returns {Promise<Object>} Updated tenant
   * @throws {Error} If validation fails, tenant not found, or document already exists
   */
  async updateTenant(tenantId, data) {
    // Validate input
    const validatedData = updateTenantSchema.parse(data);
    
    // Check if tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { tenantId }
    });
    
    if (!existingTenant) {
      const error = new Error('Tenant não encontrado');
      error.code = 'TENANT_NOT_FOUND';
      throw error;
    }
    
    // Check for duplicate document (excluding current tenant)
    if (validatedData.document !== existingTenant.document) {
      const duplicateTenant = await prisma.tenant.findUnique({
        where: { document: validatedData.document }
      });
      
      if (duplicateTenant) {
        const error = new Error('Documento já cadastrado');
        error.code = 'DUPLICATE_DOCUMENT';
        throw error;
      }
    }
    
    // Update tenant
    const tenant = await prisma.tenant.update({
      where: { tenantId },
      data: {
        tenantType: validatedData.tenantType,
        fullName: validatedData.fullName || '',
        tradeName: validatedData.tradeName,
        document: validatedData.document,
        fiscalNumber: validatedData.fiscalNumber,
        responsibleName: validatedData.responsibleName,
        responsiblePosition: validatedData.responsiblePosition,
        phone: validatedData.phone,
        mobilePhone: validatedData.mobilePhone,
        email: validatedData.email,
        website: validatedData.website,
        street: validatedData.street,
        number: validatedData.number,
        complement: validatedData.complement,
        district: validatedData.district,
        city: validatedData.city,
        state: validatedData.state,
        zipCode: validatedData.zipCode
      }
    });
    
    return tenant;
  },
  
  /**
   * Get a tenant by ID
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Tenant data
   * @throws {Error} If tenant not found
   */
  async getTenant(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { tenantId }
    });
    
    if (!tenant) {
      const error = new Error('Tenant não encontrado');
      error.code = 'TENANT_NOT_FOUND';
      throw error;
    }
    
    return tenant;
  },
  
  /**
   * Get tenant by document
   * @param {string} document - Document (CPF/CNPJ)
   * @returns {Promise<Object|null>} Tenant data or null
   */
  async getTenantByDocument(document) {
    return prisma.tenant.findUnique({
      where: { document }
    });
  },
  
  /**
   * Validate document
   * @param {string} document - Document string
   * @param {string} tenantType - FISICA or JURIDICA
   * @returns {boolean}
   */
  validateDocument(document, tenantType) {
    return validateDocument(document, tenantType);
  }
};
