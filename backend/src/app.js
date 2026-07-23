import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import notesRoutes from './modules/notes/notes.routes.js';
import foldersRoutes from './modules/folders/folders.routes.js';
import relationsRoutes from './modules/relations/relations.routes.js';
import appsRoutes from './modules/apps/apps.routes.js';
import tenantsRoutes from './modules/tenants/tenants.routes.js';
import onboardingRoutes from './modules/onboarding/onboarding.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: logger,
    // Behind the Nginx proxy (see nginx.conf). Without this, request.ip is the
    // proxy container IP for every client and the rate-limit bucket below would
    // be shared by all users of the app.
    trustProxy: true
  });

  // Register plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Id']
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // Key per session, not per IP, so one user's bulk operation cannot exhaust
    // the budget of everyone else behind the same NAT/proxy.
    //
    // The plugin runs on `onRequest`, which is BEFORE the `authenticate`
    // preHandler that populates request.user — so request.user.id is not
    // available here. The bearer token is unique per session and is the closest
    // stable identity available at this point. Public routes fall back to the IP.
    keyGenerator: (request) => request.headers.authorization || request.ip
  });

  // Error handling
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register API routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(notesRoutes, { prefix: '/api/notes' });
  await app.register(foldersRoutes, { prefix: '/api/folders' });
  await app.register(relationsRoutes, { prefix: '/api/relations' });
  await app.register(appsRoutes, { prefix: '/api/apps' });
  await app.register(tenantsRoutes, { prefix: '/api/tenants' });
  await app.register(onboardingRoutes, { prefix: '/api/onboarding' });

  return app;
}
