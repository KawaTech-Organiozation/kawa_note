import { tenantsService } from './tenants.service.js';
import { normalizeDocument } from '../../utils/normalizers.js';

/**
 * Tenants Controller
 * Handles HTTP requests for tenant management
 */
export const tenantsController = {
  /**
   * Create a new tenant
   * POST /api/tenants
   */
  async createTenant(request, reply) {
    try {
      const tenant = await tenantsService.createTenant(request.body, request.user?.id);
      
      return reply.code(201).send({
        success: true,
        data: tenant
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_DOCUMENT') {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_DOCUMENT',
            message: 'Documento já cadastrado'
          }
        });
      }
      
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: error.errors
          }
        });
      }
      
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao criar tenant'
        }
      });
    }
  },
  
  /**
   * Update an existing tenant
   * PUT /api/tenants/:tenantId
   */
  async updateTenant(request, reply) {
    try {
      const { tenantId } = request.params;
      
      // Validate authorization: user must belong to this tenant
      if (request.user.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para atualizar este tenant'
          }
        });
      }
      
      const tenant = await tenantsService.updateTenant(tenantId, request.body);
      
      return reply.code(200).send({
        success: true,
        data: tenant
      });
    } catch (error) {
      if (error.code === 'DUPLICATE_DOCUMENT') {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'DUPLICATE_DOCUMENT',
            message: 'Documento já cadastrado'
          }
        });
      }
      
      if (error.code === 'TENANT_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant não encontrado'
          }
        });
      }
      
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Dados inválidos',
            details: error.errors
          }
        });
      }
      
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao atualizar tenant'
        }
      });
    }
  },
  
  /**
   * Get a tenant by ID
   * GET /api/tenants/:tenantId
   */
  async getTenant(request, reply) {
    try {
      const { tenantId } = request.params;
      
      // Validate authorization: user must belong to this tenant
      if (request.user.tenantId !== tenantId) {
        return reply.code(403).send({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Você não tem permissão para acessar este tenant'
          }
        });
      }
      
      const tenant = await tenantsService.getTenant(tenantId);
      
      return reply.code(200).send({
        success: true,
        data: tenant
      });
    } catch (error) {
      if (error.code === 'TENANT_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant não encontrado'
          }
        });
      }
      
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar tenant'
        }
      });
    }
  },
  
  /**
   * Get tenant by document
   * GET /api/tenants/by-document/:document
   */
  async getTenantByDocument(request, reply) {
    try {
      const { document } = request.params;
      
      const cleanDocument = normalizeDocument(document);
      
      const tenant = await tenantsService.getTenantByDocument(cleanDocument);
      
      if (!tenant) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant não encontrado'
          }
        });
      }
      
      return reply.code(200).send({
        success: true,
        data: tenant
      });
    } catch (error) {
      if (error.message && error.message.includes('dígitos')) {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'INVALID_DOCUMENT',
            message: error.message
          }
        });
      }
      
      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar tenant'
        }
      });
    }
  }
};
