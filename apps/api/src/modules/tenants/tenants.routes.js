import { tenantsController } from './tenants.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

export default async function tenantsRoutes(app) {
  // Create tenant (public - for initial registration)
  app.post('/', tenantsController.createTenant);
  
  // Update tenant (protected)
  app.put('/:tenantId', { onRequest: authenticate }, tenantsController.updateTenant);
  
  // Get tenant by ID (protected)
  app.get('/:tenantId', { onRequest: authenticate }, tenantsController.getTenant);
  
  // Get tenant by document (protected)
  app.get('/by-document/:document', { onRequest: authenticate }, tenantsController.getTenantByDocument);
}
