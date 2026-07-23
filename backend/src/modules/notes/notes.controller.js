import { notesService } from './notes.service.js';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response.js';
import {
  createNoteSchema,
  bulkCreateNotesSchema,
  updateNoteSchema,
  listNotesQuerySchema,
  noteIdParamSchema
} from './notes.schema.js';

export const notesController = {
  async list(request, reply) {
    const filters = listNotesQuerySchema.parse(request.query);
    const result = await notesService.listNotes(request.user.id, request.user.tenantId, filters);
    return reply.send(paginatedResponse(result.notes, result.pagination));
  },

  async getById(request, reply) {
    const { id } = noteIdParamSchema.parse(request.params);
    const note = await notesService.getNoteById(request.user.id, request.user.tenantId, id);
    
    if (!note) {
      return reply.status(404).send(errorResponse('Note not found', 'NOT_FOUND', 404));
    }
    
    return reply.send(successResponse(note));
  },

  async create(request, reply) {
    const data = createNoteSchema.parse(request.body);

    try {
      const note = await notesService.createNote(request.user.id, request.user.tenantId, data);
      return reply.status(201).send(successResponse(note, 'Note created successfully'));
    } catch (error) {
      if (error.message === 'Folder not found') {
        return reply.status(404).send(errorResponse('Folder not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async bulkCreate(request, reply) {
    const { notes } = bulkCreateNotesSchema.parse(request.body);
    const result = await notesService.createNotesBulk(request.user.id, request.user.tenantId, notes);
    return reply.status(201).send(successResponse(result, 'Notes created'));
  },

  async update(request, reply) {
    const { id } = noteIdParamSchema.parse(request.params);
    const data = updateNoteSchema.parse(request.body);
    
    try {
      const note = await notesService.updateNote(request.user.id, request.user.tenantId, id, data);
      return reply.send(successResponse(note, 'Note updated successfully'));
    } catch (error) {
      if (error.message === 'Note not found') {
        return reply.status(404).send(errorResponse('Note not found', 'NOT_FOUND', 404));
      }
      if (error.message === 'Folder not found') {
        return reply.status(404).send(errorResponse('Folder not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async delete(request, reply) {
    const { id } = noteIdParamSchema.parse(request.params);
    
    try {
      const result = await notesService.deleteNote(request.user.id, request.user.tenantId, id);
      return reply.send(successResponse(result, 'Note deleted successfully'));
    } catch (error) {
      if (error.message === 'Note not found') {
        return reply.status(404).send(errorResponse('Note not found', 'NOT_FOUND', 404));
      }
      throw error;
    }
  },

  async search(request, reply) {
    const { q } = request.query;
    
    if (!q || q.trim().length === 0) {
      return reply.status(400).send(errorResponse('Search query is required', 'VALIDATION_ERROR', 400));
    }
    
    const notes = await notesService.searchNotes(request.user.id, request.user.tenantId, q);
    return reply.send(successResponse(notes, 'Search completed'));
  }
};
