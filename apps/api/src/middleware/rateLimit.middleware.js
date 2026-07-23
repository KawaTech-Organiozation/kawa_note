/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for rate limiting
 */

const rateLimitStore = new Map();

const DEFAULT_LIMIT = 5; // requests
const DEFAULT_WINDOW = 60 * 1000; // 1 minute in ms

export const createRateLimiter = (limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW) => {
  return async (request, reply) => {
    const key = request.ip; // Use IP address as key
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return;
    }

    const record = rateLimitStore.get(key);

    // Reset if window expired
    if (now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return;
    }

    // Increment counter
    record.count++;

    if (record.count > limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Try again in ${retryAfter} seconds`,
          retryAfter
        }
      });
    }
  };
};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
