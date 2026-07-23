import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Session Cleanup Job
 * Deletes expired and revoked sessions from the database
 * Runs every hour to prevent table bloat
 */
export function startSessionCleanupJob() {
  // Run cleanup every hour
  const intervalId = setInterval(async () => {
    try {
      const now = new Date();
      
      // Delete expired sessions (older than expiresAt)
      const expiredResult = await prisma.userSession.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });
      
      // Delete revoked sessions older than 7 days (keep for audit trail)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const revokedResult = await prisma.userSession.deleteMany({
        where: {
          revokedAt: { not: null, lt: sevenDaysAgo }
        }
      });
      
      const totalDeleted = expiredResult.count + revokedResult.count;
      
      if (totalDeleted > 0) {
        logger.info(
          `Session cleanup: deleted ${expiredResult.count} expired + ${revokedResult.count} revoked sessions`
        );
      }
    } catch (error) {
      logger.error('Session cleanup job failed:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  return intervalId;
}

/**
 * Stop the session cleanup job
 * @param {number} intervalId - The interval ID returned by startSessionCleanupJob
 */
export function stopSessionCleanupJob(intervalId) {
  clearInterval(intervalId);
}
