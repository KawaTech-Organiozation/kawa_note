import { relationsService } from './relations.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { 
  createRelationSchema, 
  updateRelationSchema, 
  relationIdParamSchema,
  noteIdParamSchema
} from './relations.schema.js';

export const relationsController = {
  async list(request, reply) {
    const { page, limit } = request.query;
    const result = await relationsService.listRelations(request.user.id, request.user.tenantId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50
    });
    return reply.send(successResponse(result.relations));
  },

  async getRelatedNotes(request, reply) {
    const { id } = noteIdParamSchema.parse(request.params);
    
    try {
      const relatedNotes = await relationsService.getRelatedNotes(request.user.id, request.user.tenantId, id);
      return reply.send(successResponse(relatedNotes));
    } catch (error) {
      if (error.message === 'Note not found') {
        return reply.status(404).send(errorResponse('Note not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async create(request, reply) {
    const data = createRelationSchema.parse(request.body);
    
    try {
      const relation = await relationsService.createRelation(request.user.id, request.user.tenantId, data);
      return reply.status(201).send(successResponse(relation, 'Relation created successfully'));
    } catch (error) {
      if (error.message === 'Source note not found') {
        return reply.status(404).send(errorResponse('Source note not found', 'NOT_FOUND', 404));
      }
      if (error.message === 'Target note not found') {
        return reply.status(404).send(errorResponse('Target note not found', 'NOT_FOUND', 404));
      }
      if (error.message === 'Cannot create relation to the same note') {
        return reply.status(400).send(errorResponse('Cannot create relation to the same note', 'VALIDATION_ERROR', 400));
      }
      if (error.message === 'Relation already exists') {
        return reply.status(409).send(errorResponse('Relation already exists', 'DUPLICATE_ENTRY', 409));
      }
      throw error;
    }
  },

  async update(request, reply) {
    const { id } = relationIdParamSchema.parse(request.params);
    const data = updateRelationSchema.parse(request.body);
    
    try {
      const relation = await relationsService.updateRelation(request.user.id, request.user.tenantId, id, data);
      return reply.send(successResponse(relation, 'Relation updated successfully'));
    } catch (error) {
      if (error.message === 'Relation not found') {
        return reply.status(404).send(errorResponse('Relation not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async delete(request, reply) {
    const { id } = relationIdParamSchema.parse(request.params);
    
    try {
      await relationsService.deleteRelation(request.user.id, request.user.tenantId, id);
      return reply.send(successResponse({ id }, 'Relation deleted successfully'));
    } catch (error) {
      if (error.message === 'Relation not found') {
        return reply.status(404).send(errorResponse('Relation not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async getGraph(request, reply) {
    const graph = await relationsService.getRelationGraph(request.user.id, request.user.tenantId);
    return reply.send(successResponse(graph));
  }
};
