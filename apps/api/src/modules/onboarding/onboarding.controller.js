import { onboardingService } from './onboarding.service.js';

/**
 * Onboarding Controller
 * Handles HTTP requests for onboarding flow
 */
export const onboardingController = {
  /**
   * Create user credentials (STEP 2) — PUBLIC
   * POST /api/onboarding/step-2
   * Body: { tenantId, name, email, phone, password }
   * Returns: { userId, tenantId, accessToken, refreshToken }
   */
  async createUserCredentials(request, reply) {
    try {
      const result = await onboardingService.createUserCredentials(request.body);

      return reply.code(201).send({
        success: true,
        data: result
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

      if (error.code === 'TENANT_STEP_INVALID') {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'TENANT_STEP_INVALID',
            message: 'Tenant já possui usuário cadastrado'
          }
        });
      }

      if (error.code === 'EMAIL_IN_USE') {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'EMAIL_IN_USE',
            message: 'Email já está em uso'
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
          message: 'Erro ao criar credenciais'
        }
      });
    }
  },

  /**
   * Get available plans (STEP 3)
   * GET /api/onboarding/plans
   */
  async getPlans(request, reply) {
    try {
      const plans = await onboardingService.getPlans();

      return reply.code(200).send({
        success: true,
        data: plans
      });
    } catch (error) {
      if (error.code === 'NO_PLANS_AVAILABLE') {
        return reply.code(503).send({
          success: false,
          error: {
            code: 'NO_PLANS_AVAILABLE',
            message: 'Nenhum plano disponível no momento'
          }
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar planos'
        }
      });
    }
  },

  /**
   * Select plan (STEP 3)
   * POST /api/onboarding/step-3
   */
  async selectPlan(request, reply) {
    try {
      const userId = request.user.id;
      const result = await onboardingService.selectPlan(userId, request.body);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.code === 'USER_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
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
          message: 'Erro ao selecionar plano'
        }
      });
    }
  },

  /**
   * Complete onboarding (STEP 4)
   * POST /api/onboarding/complete
   */
  async completeOnboarding(request, reply) {
    try {
      const userId = request.user.id;
      const result = await onboardingService.completeOnboarding(userId);

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.code === 'USER_NOT_FOUND') {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Usuário não encontrado'
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

      if (error.code === 'ONBOARDING_INCOMPLETE') {
        return reply.code(400).send({
          success: false,
          error: {
            code: 'ONBOARDING_INCOMPLETE',
            message: 'Onboarding não foi completado em todos os steps'
          }
        });
      }

      request.log.error(error);
      return reply.code(500).send({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao completar onboarding'
        }
      });
    }
  }
};
