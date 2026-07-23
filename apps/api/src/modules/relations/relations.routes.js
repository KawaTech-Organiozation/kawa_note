import { relationsController } from './relations.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

export default async function relationsRoutes(app) {
  // All relations routes require authentication and tenant
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireTenant);

  // Specific routes must come before parameterized routes
  app.get('/graph', relationsController.getGraph);
  app.get('/note/:id', relationsController.getRelatedNotes);
  
  // Generic routes
  app.get('/', relationsController.list);
  app.post('/', relationsController.create);
  app.put('/:id', relationsController.update);
  app.delete('/:id', relationsController.delete);
}
