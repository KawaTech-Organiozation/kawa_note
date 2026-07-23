import { errorResponse } from '../utils/response.js';

export const requireTenant = async (request, reply) => {
  if (!request.user?.tenantId) {
    return reply.status(403).send(
      errorResponse(
        'User must complete onboarding before accessing this resource',
        'TENANT_REQUIRED',
        403
      )
    );
  }

  // Validar isolamento cross-tenant se tenantId está no path ou body
  const requestTenantId = request.params?.tenantId || request.body?.tenantId;
  if (requestTenantId && requestTenantId !== request.user.tenantId) {
    return reply.status(403).send(
      errorResponse(
        'Cannot access resources from another tenant',
        'CROSS_TENANT_ACCESS',
        403
      )
    );
  }

  request.tenantId = request.user.tenantId;
};
