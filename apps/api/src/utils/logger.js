import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Parse LOG_LEVEL environment variable
 * Format: "debug:auth,info:*" means debug for auth module, info for all others
 * @returns {Object} Log level configuration
 */
function parseLogLevels() {
  const logLevelEnv = process.env.LOG_LEVEL || '';
  const levels = {};

  if (!logLevelEnv) {
    return { default: process.env.NODE_ENV === 'development' ? 'debug' : 'info' };
  }

  const parts = logLevelEnv.split(',');
  parts.forEach(part => {
    const [module, level] = part.split(':');
    if (module && level) {
      levels[module.trim()] = level.trim();
    }
  });

  return levels;
}

const logLevels = parseLogLevels();
const defaultLevel = logLevels.default || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');

export const logger = pino({
  level: defaultLevel,
  transport: process.env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

/**
 * Create a child logger for a specific module
 * @param {string} moduleName - Name of the module (e.g., 'auth', 'notes')
 * @returns {Object} Child logger instance
 */
export function createModuleLogger(moduleName) {
  const moduleLevel = logLevels[moduleName] || logLevels['*'] || defaultLevel;
  return logger.child({ module: moduleName, level: moduleLevel });
}
