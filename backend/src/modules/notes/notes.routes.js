import { notesController } from './notes.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

export default async function notesRoutes(app) {
  // All notes routes require authentication and tenant
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireTenant);

  app.get('/', notesController.list);
  app.get('/search', notesController.search);
  app.get('/:id', notesController.getById);
  app.post('/', notesController.create);
  // Larger body limit than the 1MiB default: a batch carries up to 200
  // client-side encrypted notes.
  app.post('/bulk', { bodyLimit: 10 * 1024 * 1024 }, notesController.bulkCreate);
  app.put('/:id', notesController.update);
  app.delete('/:id', notesController.delete);
}
