import { authService } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { loginSchema, refreshTokenSchema, encryptionSaltSchema } from './auth.schema.js';

export const authController = {
  async login(request, reply) {
    try {
      const data = loginSchema.parse(request.body);
      
      // Extract device info from user-agent
      const userAgent = request.headers['user-agent'] || '';
      const deviceInfo = extractDeviceInfo(userAgent);
      
      // Extract IP address
      const ipAddress = request.ip;
      
      const result = await authService.login({
        ...data,
        deviceInfo,
        ipAddress
      });
      return reply.send(successResponse(result, 'Login successful'));
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return reply.status(401).send(errorResponse('Invalid credentials', 'INVALID_CREDENTIALS', 401));
      }
      throw error;
    }
  },

  async me(request, reply) {
    const user = await authService.getMe(request.user.id);
    return reply.send(successResponse(user));
  },

  async logout(request, reply) {
    try {
      const { refreshToken } = request.body;
      if (!refreshToken) {
        return reply.status(400).send(errorResponse('Refresh token required', 'MISSING_REFRESH_TOKEN', 400));
      }
      
      await authService.logout(refreshToken);
      return reply.send(successResponse(null, 'Logout successful'));
    } catch (error) {
      return reply.status(400).send(errorResponse('Logout failed', 'LOGOUT_FAILED', 400));
    }
  },

  async refresh(request, reply) {
    try {
      const data = refreshTokenSchema.parse(request.body);
      const tokens = await authService.refreshToken(data.refreshToken);
      return reply.send(successResponse(tokens, 'Token refreshed successfully'));
    } catch (error) {
      if (error.message.includes('Session')) {
        return reply.status(401).send(errorResponse(error.message, 'INVALID_SESSION', 401));
      }
      if (error.message === 'Invalid refresh token') {
        return reply.status(401).send(errorResponse('Invalid refresh token', 'INVALID_TOKEN', 401));
      }
      throw error;
    }
  },

  async updateEncryptionSalt(request, reply) {
    try {
      const data = encryptionSaltSchema.parse(request.body);
      const user = await authService.updateEncryptionSalt(
        request.user.id,
        data.encryptionSalt,
        data.encryptionVerifier
      );
      return reply.send(successResponse(user, 'Encryption salt updated successfully'));
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Extract simplified device info from user-agent
 * @param {string} userAgent - User-Agent header
 * @returns {object} Device info object
 */
function extractDeviceInfo(userAgent) {
  const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
  const isChrome = /chrome/i.test(userAgent);
  const isFirefox = /firefox/i.test(userAgent);
  const isSafari = /safari/i.test(userAgent) && !isChrome;
  
  let browser = 'Unknown';
  if (isChrome) browser = 'Chrome';
  else if (isFirefox) browser = 'Firefox';
  else if (isSafari) browser = 'Safari';
  
  return {
    type: isMobile ? 'mobile' : 'desktop',
    browser,
    userAgent: userAgent.substring(0, 255) // Limit length
  };
}
