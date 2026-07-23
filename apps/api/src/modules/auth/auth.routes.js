import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { createRateLimiter } from '../../middleware/rateLimit.middleware.js';

// Rate limiter: 5 attempts per minute for refresh token
const refreshRateLimiter = createRateLimiter(5, 60 * 1000);

export default async function authRoutes(app) {
  // Public routes
  app.post('/login', authController.login);
  app.post('/refresh', { preHandler: [refreshRateLimiter] }, authController.refresh);

  // Protected routes
  app.get('/me', { preHandler: [authenticate] }, authController.me);
  app.post('/logout', { preHandler: [authenticate] }, authController.logout);
  app.put('/encryption-salt', { preHandler: [authenticate] }, authController.updateEncryptionSalt);
}
