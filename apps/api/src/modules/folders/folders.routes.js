import { foldersController } from './folders.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireTenant } from '../../middleware/tenant.middleware.js';

export default async function foldersRoutes(app) {
  // All folders routes require authentication and tenant
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireTenant);

  app.get('/', foldersController.list);
  app.get('/hierarchy', foldersController.getHierarchy);
  app.get('/:id', foldersController.getById);
  app.get('/:id/notes', foldersController.getNotes);
  app.post('/', foldersController.create);
  app.post('/bulk-path', foldersController.ensurePaths);
  app.put('/:id', foldersController.update);
  app.delete('/:id', foldersController.delete);
}
