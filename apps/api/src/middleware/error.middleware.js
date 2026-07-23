import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

/**
 * Sanitize request body for logging
 * Removes sensitive fields like passwords, tokens, etc.
 */
function sanitizeForLogging(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'JWT_SECRET', 'accessToken', 'secret'];

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

export const errorHandler = (error, request, reply) => {
  logger.error({
    err: error,
    req: {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: sanitizeForLogging(request.body)
    }
  }, 'Request error');

  // Zod validation errors
  if (error.name === 'ZodError') {
    const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    return reply.status(400).send(errorResponse(messages, 'VALIDATION_ERROR', 400));
  }

  // Prisma errors
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return reply.status(409).send(
          errorResponse('Resource already exists', 'DUPLICATE_ENTRY', 409)
        );
      case 'P2025':
        return reply.status(404).send(
          errorResponse('Resource not found', 'NOT_FOUND', 404)
        );
      case 'P2003':
        return reply.status(400).send(
          errorResponse('Foreign key constraint failed', 'CONSTRAINT_ERROR', 400)
        );
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : error.message;
  
  return reply.status(statusCode).send(errorResponse(message, 'INTERNAL_ERROR', statusCode));
};

export const notFoundHandler = (request, reply) => {
  return reply.status(404).send(errorResponse('Route not found', 'NOT_FOUND', 404));
};
