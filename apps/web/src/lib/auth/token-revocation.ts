/**
 * Token Revocation Service
 *
 * Manages JWT token revocation using Redis for high-performance checks.
 * Implements a token blocklist approach with automatic cleanup.
 *
 * @compliance HIPAA §164.312(a)(2)(iii) - Session termination
 * @compliance SOC 2 CC6.1 - Logical access controls
 */

import { getCacheClient } from '@/lib/cache/redis-client';
import logger from '@/lib/logger';
import crypto from 'crypto';

/**
 * Token revocation reasons for audit logging
 */
export enum RevocationReason {
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SECURITY_BREACH = 'SECURITY_BREACH',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ADMIN_REVOKED = 'ADMIN_REVOKED',
  CONCURRENT_LIMIT = 'CONCURRENT_LIMIT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

/**
 * Revoked token metadata
 */
interface RevokedTokenMetadata {
  tokenId: string;
  userId: string;
  reason: RevocationReason;
  revokedAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Token Revocation Manager
 */
export class TokenRevocationService {
  private readonly REVOCATION_PREFIX = 'revoked:token:';
  private readonly USER_TOKENS_PREFIX = 'user:tokens:';
  private redis = getCacheClient();

  /**
   * Generate a unique token ID from JWT
   */
  private generateTokenId(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Revoke a specific token
   */
  async revokeToken(
    token: string,
    userId: string,
    reason: RevocationReason,
    expiresAt: Date,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const tokenId = this.generateTokenId(token);
    const key = `${this.REVOCATION_PREFIX}${tokenId}`;

    // Calculate TTL based on token expiration
    const now = new Date();
    const ttlSeconds = Math.max(
      Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      0
    );

    // Store revocation with metadata
    const revocationData: RevokedTokenMetadata = {
      tokenId,
      userId,
      reason,
      revokedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    await this.redis.set(key, revocationData, ttlSeconds);

    logger.info({
      event: 'token_revoked',
      userId,
      tokenId,
      reason,
      ttlSeconds,
      ipAddress: metadata?.ipAddress,
    });
  }

  /**
   * Check if a token is revoked
   */
  async isTokenRevoked(token: string): Promise<boolean> {
    const tokenId = this.generateTokenId(token);
    const key = `${this.REVOCATION_PREFIX}${tokenId}`;

    const exists = await this.redis.exists(key);
    return exists;
  }

  /**
   * Get revocation details for a token
   */
  async getRevocationDetails(token: string): Promise<RevokedTokenMetadata | null> {
    const tokenId = this.generateTokenId(token);
    const key = `${this.REVOCATION_PREFIX}${tokenId}`;

    const data = await this.redis.get<RevokedTokenMetadata>(key);
    return data;
  }

  /**
   * Revoke all tokens for a user
   * Used when password changes or security breach detected
   */
  async revokeAllUserTokens(
    userId: string,
    reason: RevocationReason,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<number> {
    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;

    try {
      // Get all active tokens for user
      const tokens = await this.redis.get<string[]>(userTokensKey);

      if (!tokens || tokens.length === 0) {
        logger.info({
          event: 'no_tokens_to_revoke',
          userId,
        });
        return 0;
      }

      // Revoke each token
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours from now

      for (const token of tokens) {
        await this.revokeToken(token, userId, reason, expiresAt, metadata);
      }

      // Clear user's token list
      await this.redis.delete(userTokensKey);

      logger.info({
        event: 'all_user_tokens_revoked',
        userId,
        count: tokens.length,
        reason,
      });

      return tokens.length;
    } catch (error) {
      logger.error({
        event: 'revoke_user_tokens_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Track active token for a user
   */
  async trackUserToken(userId: string, token: string, ttlSeconds: number = 28800): Promise<void> {
    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;

    try {
      // Get existing tokens
      const existingTokens = (await this.redis.get<string[]>(userTokensKey)) || [];

      // Add new token
      const updatedTokens = [...existingTokens, token];

      // Store with TTL (8 hours default)
      await this.redis.set(userTokensKey, updatedTokens, ttlSeconds);

      logger.debug({
        event: 'token_tracked',
        userId,
        tokenCount: updatedTokens.length,
      });
    } catch (error) {
      logger.error({
        event: 'track_token_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - tracking is not critical
    }
  }

  /**
   * Remove token from user's active list
   */
  async untrackUserToken(userId: string, token: string): Promise<void> {
    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;

    try {
      const existingTokens = (await this.redis.get<string[]>(userTokensKey)) || [];

      // Remove token
      const updatedTokens = existingTokens.filter((t) => t !== token);

      if (updatedTokens.length > 0) {
        await this.redis.set(userTokensKey, updatedTokens, 28800);
      } else {
        await this.redis.delete(userTokensKey);
      }

      logger.debug({
        event: 'token_untracked',
        userId,
        tokenCount: updatedTokens.length,
      });
    } catch (error) {
      logger.error({
        event: 'untrack_token_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - tracking is not critical
    }
  }

  /**
   * Get count of active tokens for a user
   */
  async getUserTokenCount(userId: string): Promise<number> {
    const userTokensKey = `${this.USER_TOKENS_PREFIX}${userId}`;
    const tokens = (await this.redis.get<string[]>(userTokensKey)) || [];
    return tokens.length;
  }

  /**
   * Cleanup expired revocations (maintenance task)
   * Note: Redis TTL handles this automatically, but this is for manual cleanup
   */
  async cleanupExpiredRevocations(): Promise<number> {
    try {
      const pattern = `${this.REVOCATION_PREFIX}*`;
      const deleted = await this.redis.deletePattern(pattern);

      logger.info({
        event: 'revocations_cleanup',
        deleted,
      });

      return deleted;
    } catch (error) {
      logger.error({
        event: 'cleanup_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}

// Singleton instance
let revocationServiceInstance: TokenRevocationService | null = null;

/**
 * Get or create token revocation service (singleton)
 */
export function getTokenRevocationService(): TokenRevocationService {
  if (!revocationServiceInstance) {
    revocationServiceInstance = new TokenRevocationService();
  }
  return revocationServiceInstance;
}

/**
 * Middleware helper to check token revocation
 */
export async function checkTokenRevocation(token: string): Promise<{
  isRevoked: boolean;
  reason?: RevocationReason;
  revokedAt?: string;
}> {
  const service = getTokenRevocationService();

  try {
    const isRevoked = await service.isTokenRevoked(token);

    if (!isRevoked) {
      return { isRevoked: false };
    }

    const details = await service.getRevocationDetails(token);

    return {
      isRevoked: true,
      reason: details?.reason,
      revokedAt: details?.revokedAt,
    };
  } catch (error) {
    logger.error({
      event: 'check_revocation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // On error, fail open (allow token) to prevent service disruption
    return { isRevoked: false };
  }
}
