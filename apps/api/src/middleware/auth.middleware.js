import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { errorResponse } from '../utils/response.js';

export const authenticate = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send(errorResponse('Authentication required', 'AUTH_REQUIRED', 401));
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return reply.status(401).send(errorResponse('Token not provided', 'TOKEN_MISSING', 401));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, tenantId: true, createdAt: true }
    });

    if (!user) {
      return reply.status(401).send(errorResponse('User not found', 'USER_NOT_FOUND', 401));
    }

    request.user = user;
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return reply.status(401).send(errorResponse('Invalid token', 'INVALID_TOKEN', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return reply.status(401).send(errorResponse('Token expired', 'TOKEN_EXPIRED', 401));
    }
    return reply.status(401).send(errorResponse('Authentication failed', 'AUTH_FAILED', 401));
  }
};

export const optionalAuth = async (request, reply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      request.user = null;
      return;
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      request.user = null;
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, tenantId: true, createdAt: true }
    });

    request.user = user;
  } catch {
    request.user = null;
  }
};
