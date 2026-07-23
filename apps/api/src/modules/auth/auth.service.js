import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Hash a refresh token using SHA-256
 * @param {string} token - The refresh token to hash
 * @returns {string} SHA-256 hash of the token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async login(data) {
    const { email, password, deviceInfo, ipAddress } = data;

    // Single query to get user with password
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Return generic error for both cases (user not found or password invalid)
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const tokens = generateTokens(user.id, user.tenantId);
    
    // Create UserSession in database
    const tokenHashValue = hashToken(tokens.refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days
    
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        tokenHash: tokenHashValue,
        deviceInfo: deviceInfo || null,
        ipAddress: ipAddress || null,
        expiresAt
      }
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        encryptionSalt: user.encryptionSalt,
        encryptionVerifier: user.encryptionVerifier,
        createdAt: user.createdAt
      },
      ...tokens
    };
  },

  async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        encryptionSalt: true,
        encryptionVerifier: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  async refreshToken(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      
      // Validate token type
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Validate session in database
      const tokenHashValue = hashToken(token);
      const session = await prisma.userSession.findFirst({
        where: {
          tokenHash: tokenHashValue,
          userId: decoded.userId
        }
      });
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      if (session.revokedAt !== null) {
        throw new Error('Session revoked');
      }
      
      if (session.expiresAt < new Date()) {
        throw new Error('Session expired');
      }
      
      // Generate new tokens (token rotation)
      const tokens = generateTokens(decoded.userId, decoded.tenantId);
      const newTokenHashValue = hashToken(tokens.refreshToken);
      
      // Update session with new token hash and lastUsedAt
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          tokenHash: newTokenHashValue,
          lastUsedAt: new Date()
        }
      });
      
      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  },

  async updateEncryptionSalt(userId, encryptionSalt, encryptionVerifier) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { encryptionSalt, encryptionVerifier },
      select: {
        id: true,
        email: true,
        name: true,
        tenantId: true,
        encryptionSalt: true,
        encryptionVerifier: true,
        createdAt: true
      }
    });

    return user;
  },

  async logout(refreshToken) {
    try {
      const tokenHashValue = hashToken(refreshToken);
      
      // Revoke the session
      await prisma.userSession.updateMany({
        where: { tokenHash: tokenHashValue },
        data: { revokedAt: new Date() }
      });
      
      return { success: true };
    } catch (error) {
      throw new Error('Logout failed');
    }
  }
};

function generateTokens(userId, tenantId = null) {
  const accessToken = jwt.sign(
    { userId, tenantId, type: 'access' },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId, tenantId, type: 'refresh' },
    env.JWT_SECRET,
    { expiresIn: '90d' }
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: '15m'
  };
}
