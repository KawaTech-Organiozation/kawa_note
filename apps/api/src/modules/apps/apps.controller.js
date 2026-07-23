import { appsService } from './apps.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export const appsController = {
  async getPublicSettings(request, reply) {
    try {
      const { appId } = request.params;
      const settings = await appsService.getPublicSettings(appId);
      return reply.send(successResponse(settings));
    } catch (error) {
      if (error.message === 'App ID is required') {
        return reply.status(400).send(errorResponse('App ID is required', 'VALIDATION_ERROR', 400));
      }
      if (error.status === 404) {
        return reply.status(404).send(errorResponse(error.message, 'NOT_FOUND', 404));
      }
      throw error;
    }
  }
};
