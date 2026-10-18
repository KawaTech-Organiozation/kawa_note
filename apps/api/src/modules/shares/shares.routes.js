import { sharesController } from './shares.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

export default async function sharesRoutes(app) {
  app.get('/public/:id', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, sharesController.publicRead);
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireTenant);
  app.get('/', sharesController.list);
  app.post('/', sharesController.create);
  app.post('/:id/revoke', sharesController.revoke);
}
