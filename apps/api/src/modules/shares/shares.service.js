import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../config/database.js';

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function matchesToken(token, expectedHash) {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicShare(share) {
  return {
    id: share.id,
    folderNameSnapshot: share.folderNameSnapshot,
    ciphertext: share.ciphertext,
    iv: share.iv,
    expiresAt: share.expiresAt,
    maxViews: share.maxViews,
    viewCount: share.viewCount
  };
}

export const sharesService = {
  async create(userId, tenantId, data) {
    const expiresAt = new Date(data.expiresAt);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new Error('Share expiry must be in the future');
    }

    const token = randomBytes(32).toString('base64url');
    const share = await prisma.vaultShare.create({
      data: {
        ownerUserId: userId,
        tenantId,
        folderNameSnapshot: data.folderNameSnapshot,
        ciphertext: data.ciphertext,
        iv: data.iv,
        tokenHash: hashToken(token),
        expiresAt,
        maxViews: data.maxViews
      }
    });

    return { ...publicShare(share), token };
  },

  async readPublic(id, token) {
    if (!token) return null;
    const share = await prisma.vaultShare.findUnique({ where: { id } });
    if (!share) return null;
    const valid = share.revokedAt === null && share.expiresAt > new Date() && share.viewCount < share.maxViews;
    if (!valid || !matchesToken(token, share.tokenHash)) return null;

    const updated = await prisma.vaultShare.updateMany({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        viewCount: { lt: share.maxViews },
        tokenHash: share.tokenHash
      },
      data: { viewCount: { increment: 1 }, lastAccessedAt: new Date() }
    });
    return updated.count === 1 ? publicShare({ ...share, viewCount: share.viewCount + 1 }) : null;
  },

  async revoke(userId, tenantId, id) {
    const result = await prisma.vaultShare.updateMany({
      where: { id, ownerUserId: userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
    if (result.count === 0) throw new Error('Share not found');
    return { id, revoked: true };
  },

  async list(userId, tenantId) {
    return prisma.vaultShare.findMany({
      where: { ownerUserId: userId, tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, folderNameSnapshot: true, expiresAt: true, maxViews: true, viewCount: true, revokedAt: true, createdAt: true }
    });
  }
};
