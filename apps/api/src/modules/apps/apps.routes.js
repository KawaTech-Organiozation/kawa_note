import { appsController } from './apps.controller.js';

export default async function appsRoutes(app) {
  // Public route - no authentication required
  app.get('/public/prod/public-settings/by-id/:appId', appsController.getPublicSettings);
}
