import { prisma } from '../../config/database.js';

export const appsService = {
  async getPublicSettings(appId) {
    if (!appId) {
      throw new Error('App ID is required');
    }

    // Fetch app from database
    const app = await prisma.app.findUnique({
      where: { id: appId }
    });

    // Return 404 if app doesn't exist
    if (!app) {
      const error = new Error(`App not found: ${appId}`);
      error.status = 404;
      throw error;
    }

    return {
      id: app.id,
      public_settings: app.publicSettings
    };
  }
};
