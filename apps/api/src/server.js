import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startSessionCleanupJob } from './jobs/sessionCleanup.js';

async function start() {
  try {
    const app = await buildApp();
    
    const host = env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    const port = parseInt(env.PORT, 10);

    await app.listen({ host, port });
    
    logger.info(`Server running on http://${host}:${port}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    
    // Start session cleanup job
    startSessionCleanupJob();
    logger.info('Session cleanup job started');
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
