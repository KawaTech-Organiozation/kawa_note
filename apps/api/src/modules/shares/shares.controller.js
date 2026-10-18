import { sharesService } from './shares.service.js';
import { createShareSchema, shareIdParamSchema } from './shares.schema.js';
import { errorResponse, successResponse } from '../../utils/response.js';

export const sharesController = {
  async create(request, reply) {
    try {
      const data = createShareSchema.parse(request.body);
      return reply.status(201).send(successResponse(await sharesService.create(request.user.id, request.user.tenantId, data)));
    } catch (error) {
      if (error.message === 'Share expiry must be in the future') {
        return reply.status(422).send(errorResponse('Invalid share expiry', 'VALIDATION_ERROR', 422));
      }
      throw error;
    }
  },

  async list(request, reply) {
    return reply.send(successResponse(await sharesService.list(request.user.id, request.user.tenantId)));
  },

  async publicRead(request, reply) {
    const { id } = shareIdParamSchema.parse(request.params);
    const share = await sharesService.readPublic(id, request.headers['x-share-token']);
    if (!share) return reply.status(404).send(errorResponse('Share unavailable', 'NOT_FOUND', 404));
    return reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').send(successResponse(share));
  },

  async revoke(request, reply) {
    const { id } = shareIdParamSchema.parse(request.params);
    try {
      return reply.send(successResponse(await sharesService.revoke(request.user.id, request.user.tenantId, id)));
    } catch (error) {
      if (error.message === 'Share not found') return reply.status(404).send(errorResponse('Share not found', 'NOT_FOUND', 404));
      throw error;
    }
  }
};
