/**
 * Session Revocation Store
 *
 * SOC 2 Control: CC6.1 (Logical Access Controls - Session Management)
 *
 * This module provides JWT session revocation capability using Redis.
 * Solves the problem: "How do we invalidate JWT tokens before they expire?"
 *
 * Architecture:
 * - Redis stores revoked token hashes (SHA-256)
 * - 30-day TTL (matches NextAuth JWT expiry)
 * - Sub-millisecond lookup performance
 * - Automatic cleanup via Redis TTL
 *
 * Use Cases:
 * - User logout (revoke current session)
 * - Security incident (revoke all user sessions)
 * - Admin action (force logout specific user)
 * - Password change (revoke all sessions)
 * - MFA enrollment (revoke old sessions)
 *
 * Integration with NextAuth:
 * - JWT callback: Check if token is revoked
 * - Session callback: Reject revoked sessions
 * - Signout callback: Add token to revocation store
 *
 * Example Usage:
 * ```typescript
 * // Revoke current session on logout
 * await revokeSession(tokenHash, userId, 'USER_LOGOUT');
 *
 * // Check if session is revoked (in JWT callback)
 * const isRevoked = await isSessionRevoked(tokenHash);
 *
 * // Revoke all user sessions (password change)
 * await revokeAllUserSessions(userId, 'PASSWORD_CHANGED');
 * ```
 */

import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import crypto from 'crypto';

// Environment configuration
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Session revocation settings
const REVOCATION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days (matches JWT expiry)
const BATCH_DELETE_LIMIT = 100; // Max sessions to delete in one batch

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    if (!REDIS_URL || !REDIS_TOKEN) {
      throw new Error('Redis credentials not configured (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)');
    }

    redisClient = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    });
  }

  return redisClient;
}

/**
 * Revocation reason codes
 */
export type RevocationReason =
  | 'USER_LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'MFA_ENROLLMENT'
  | 'SECURITY_INCIDENT'
  | 'ADMIN_ACTION'
  | 'ROLE_CHANGED'
  | 'ACCOUNT_LOCKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SESSION_EXPIRED';

/**
 * Revoked session metadata
 */
export interface RevokedSessionMetadata {
  userId: string;
  revokedAt: number; // Unix timestamp
  reason: RevocationReason;
  revokedBy?: string; // Admin user ID if applicable
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Redis key patterns
 */
const KEYS = {
  // Hash of revoked JWT token
  revokedToken: (tokenHash: string) => `revoked:token:${tokenHash}`,

  // Set of all revoked token hashes for a user
  userSessions: (userId: string) => `revoked:user:${userId}`,

  // Global revocation counter (for monitoring)
  revocationCounter: 'revoked:counter',

  // User-specific revocation timestamp (for quick check)
  userRevocationTime: (userId: string) => `revoked:user-time:${userId}`,
};

/**
 * Create SHA-256 hash of JWT token
 *
 * We hash tokens before storing to:
 * 1. Reduce storage size
 * 2. Prevent token leakage if Redis is compromised
 * 3. Consistent key length (64 chars)
 *
 * @param token - JWT token string
 * @returns SHA-256 hash (hex)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Revoke a session token
 *
 * Adds token hash to Redis revocation store.
 * Token will be rejected on next authentication check.
 *
 * @param tokenHash - SHA-256 hash of JWT token
 * @param userId - User ID who owns the session
 * @param reason - Reason for revocation
 * @param metadata - Additional revocation metadata
 *
 * @example
 * ```typescript
 * const tokenHash = hashToken(session.accessToken);
 * await revokeSession(tokenHash, 'user_123', 'USER_LOGOUT', {
 *   ipAddress: '192.168.1.1',
 * });
 * ```
 */
export async function revokeSession(
  tokenHash: string,
  userId: string,
  reason: RevocationReason,
  metadata?: {
    revokedBy?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    const redis = getRedisClient();

    const revocationData: RevokedSessionMetadata = {
      userId,
      revokedAt: Date.now(),
      reason,
      ...metadata,
    };

    // Store revoked token with metadata
    await redis.setex(
      KEYS.revokedToken(tokenHash),
      REVOCATION_TTL_SECONDS,
      JSON.stringify(revocationData)
    );

    // Add to user's revoked sessions set
    await redis.sadd(KEYS.userSessions(userId), tokenHash);
    await redis.expire(KEYS.userSessions(userId), REVOCATION_TTL_SECONDS);

    // Update user revocation timestamp (for quick staleness check)
    await redis.set(KEYS.userRevocationTime(userId), Date.now().toString());

    // Increment global counter
    await redis.incr(KEYS.revocationCounter);

    logger.info({
      event: 'session_revoked',
      userId,
      tokenHash: tokenHash.substring(0, 8) + '...', // Log first 8 chars only
      reason,
    }, 'Session revoked successfully');

    // Audit log
    await createAuditLog({
      action: 'LOGOUT',
      resource: 'Session',
      resourceId: tokenHash.substring(0, 16),
      details: {
        reason,
        revokedBy: metadata?.revokedBy,
      },
      success: true,
    });
  } catch (error) {
    logger.error({
      event: 'session_revocation_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to revoke session');

    throw new Error(`Failed to revoke session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a session token is revoked
 *
 * Fast Redis lookup (sub-millisecond).
 * Call this in NextAuth JWT callback before allowing access.
 *
 * @param tokenHash - SHA-256 hash of JWT token
 * @returns True if token is revoked
 *
 * @example
 * ```typescript
 * const tokenHash = hashToken(token);
 * if (await isSessionRevoked(tokenHash)) {
 *   throw new Error('Session has been revoked');
 * }
 * ```
 */
export async function isSessionRevoked(tokenHash: string): Promise<boolean> {
  try {
    const redis = getRedisClient();

    const result = await redis.get(KEYS.revokedToken(tokenHash));

    return result !== null;
  } catch (error) {
    logger.error({
      event: 'session_revocation_check_failed',
      tokenHash: tokenHash.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to check session revocation status');

    // Fail-open: If Redis is down, don't block all users
    // Log the error for investigation
    return false;
  }
}

/**
 * Get revocation metadata for a token
 *
 * Returns details about why and when a session was revoked.
 *
 * @param tokenHash - SHA-256 hash of JWT token
 * @returns Revocation metadata or null if not revoked
 */
export async function getRevocationMetadata(
  tokenHash: string
): Promise<RevokedSessionMetadata | null> {
  try {
    const redis = getRedisClient();

    const data = await redis.get<string>(KEYS.revokedToken(tokenHash));

    if (!data) {
      return null;
    }

    return JSON.parse(data) as RevokedSessionMetadata;
  } catch (error) {
    logger.error({
      event: 'revocation_metadata_fetch_failed',
      tokenHash: tokenHash.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to fetch revocation metadata');

    return null;
  }
}

/**
 * Revoke all sessions for a user
 *
 * Use cases:
 * - Password changed
 * - MFA enrolled/disabled
 * - Security incident
 * - Account locked
 *
 * @param userId - User ID
 * @param reason - Reason for mass revocation
 * @param revokedBy - Admin user ID if applicable
 *
 * @example
 * ```typescript
 * // Force logout all devices after password change
 * await revokeAllUserSessions('user_123', 'PASSWORD_CHANGED');
 * ```
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: RevocationReason,
  revokedBy?: string
): Promise<{ revokedCount: number }> {
  try {
    const redis = getRedisClient();

    // Get all session hashes for this user
    const sessionHashes = await redis.smembers(KEYS.userSessions(userId));

    if (sessionHashes.length === 0) {
      logger.info({
        event: 'no_sessions_to_revoke',
        userId,
      }, 'No active sessions found for user');

      return { revokedCount: 0 };
    }

    logger.info({
      event: 'revoking_all_user_sessions',
      userId,
      sessionCount: sessionHashes.length,
      reason,
    }, 'Revoking all user sessions');

    // Revoke each session
    const revocationPromises = sessionHashes.map((tokenHash) =>
      revokeSession(tokenHash, userId, reason, { revokedBy })
    );

    await Promise.all(revocationPromises);

    // Update user revocation timestamp
    await redis.set(KEYS.userRevocationTime(userId), Date.now().toString());

    logger.info({
      event: 'all_user_sessions_revoked',
      userId,
      revokedCount: sessionHashes.length,
      reason,
    }, 'Successfully revoked all user sessions');

    // Audit log
    await createAuditLog({
      action: 'LOGOUT',
      resource: 'UserSessions',
      resourceId: userId,
      details: {
        revokedCount: sessionHashes.length,
        reason,
        revokedBy,
      },
      success: true,
    });

    return { revokedCount: sessionHashes.length };
  } catch (error) {
    logger.error({
      event: 'revoke_all_sessions_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to revoke all user sessions');

    throw new Error(`Failed to revoke all sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if user has any revoked sessions
 *
 * Faster than checking individual tokens.
 * Use this for quick staleness check in JWT callback.
 *
 * @param userId - User ID
 * @param tokenIssuedAt - When the JWT was issued (Unix timestamp)
 * @returns True if token was issued before last revocation
 *
 * @example
 * ```typescript
 * // In NextAuth JWT callback
 * if (await isTokenStale(token.sub, token.iat)) {
 *   // Token issued before last revocation, force re-login
 *   return null;
 * }
 * ```
 */
export async function isTokenStale(
  userId: string,
  tokenIssuedAt: number
): Promise<boolean> {
  try {
    const redis = getRedisClient();

    const lastRevocationTime = await redis.get<string>(
      KEYS.userRevocationTime(userId)
    );

    if (!lastRevocationTime) {
      // No revocations for this user
      return false;
    }

    const lastRevocation = parseInt(lastRevocationTime, 10);

    // Token is stale if it was issued before the last revocation
    return tokenIssuedAt * 1000 < lastRevocation; // JWT iat is in seconds
  } catch (error) {
    logger.error({
      event: 'token_staleness_check_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to check token staleness');

    // Fail-open
    return false;
  }
}

/**
 * Clean up expired revocations for a user
 *
 * Redis TTL handles automatic cleanup, but this can be called
 * manually if needed (e.g., user account deletion).
 *
 * @param userId - User ID
 */
export async function cleanupUserRevocations(userId: string): Promise<void> {
  try {
    const redis = getRedisClient();

    // Delete user's revoked sessions set
    await redis.del(KEYS.userSessions(userId));

    // Delete user's revocation timestamp
    await redis.del(KEYS.userRevocationTime(userId));

    logger.info({
      event: 'user_revocations_cleaned_up',
      userId,
    }, 'Cleaned up user revocations');
  } catch (error) {
    logger.error({
      event: 'cleanup_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to clean up user revocations');

    throw error;
  }
}

/**
 * Get revocation statistics
 *
 * Useful for monitoring and debugging.
 *
 * @returns Revocation statistics
 */
export async function getRevocationStats(): Promise<{
  totalRevocations: number;
  redisHealth: 'healthy' | 'unhealthy';
}> {
  try {
    const redis = getRedisClient();

    const totalRevocations = await redis.get<number>(KEYS.revocationCounter) || 0;

    return {
      totalRevocations,
      redisHealth: 'healthy',
    };
  } catch (error) {
    logger.error({
      event: 'revocation_stats_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get revocation statistics');

    return {
      totalRevocations: 0,
      redisHealth: 'unhealthy',
    };
  }
}

/**
 * Health check for Redis session store
 *
 * @returns Health status
 */
export async function checkSessionStoreHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const redis = getRedisClient();

    const startTime = Date.now();

    // Simple ping test
    await redis.set('health:check', 'ok', { ex: 10 });
    const result = await redis.get('health:check');

    const latency = Date.now() - startTime;

    if (result !== 'ok') {
      return {
        healthy: false,
        error: 'Redis returned unexpected value',
      };
    }

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    logger.error({
      event: 'session_store_health_check_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Session store health check failed');

    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch revoke sessions
 *
 * Efficiently revokes multiple sessions at once.
 * Use for bulk operations (e.g., mass user lockout).
 *
 * @param revocations - Array of session revocations
 * @returns Number of sessions revoked
 */
export async function batchRevokeSession(
  revocations: Array<{
    tokenHash: string;
    userId: string;
    reason: RevocationReason;
    revokedBy?: string;
  }>
): Promise<{ revokedCount: number }> {
  try {
    logger.info({
      event: 'batch_revoke_started',
      count: revocations.length,
    }, 'Starting batch session revocation');

    // Revoke in parallel (Redis can handle it)
    const promises = revocations.map(({ tokenHash, userId, reason, revokedBy }) =>
      revokeSession(tokenHash, userId, reason, { revokedBy })
    );

    await Promise.all(promises);

    logger.info({
      event: 'batch_revoke_completed',
      revokedCount: revocations.length,
    }, 'Batch session revocation completed');

    return { revokedCount: revocations.length };
  } catch (error) {
    logger.error({
      event: 'batch_revoke_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Batch session revocation failed');

    throw new Error(`Batch revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all active sessions for a user
 *
 * Returns list of session hashes (not full tokens).
 * Useful for "active sessions" dashboard.
 *
 * @param userId - User ID
 * @returns Array of session hashes
 */
export async function getUserActiveSessions(userId: string): Promise<string[]> {
  try {
    const redis = getRedisClient();

    const sessionHashes = await redis.smembers(KEYS.userSessions(userId));

    return sessionHashes;
  } catch (error) {
    logger.error({
      event: 'get_active_sessions_failed',
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to get active sessions');

    return [];
  }
}

/**
 * Extend session TTL
 *
 * Refreshes the expiration time for a revoked session entry.
 * Typically not needed (TTL auto-refreshes on revocation).
 *
 * @param tokenHash - SHA-256 hash of JWT token
 * @param ttlSeconds - New TTL in seconds
 */
export async function extendRevocationTTL(
  tokenHash: string,
  ttlSeconds: number = REVOCATION_TTL_SECONDS
): Promise<void> {
  try {
    const redis = getRedisClient();

    await redis.expire(KEYS.revokedToken(tokenHash), ttlSeconds);

    logger.debug({
      event: 'revocation_ttl_extended',
      tokenHash: tokenHash.substring(0, 8) + '...',
      ttlSeconds,
    }, 'Extended revocation TTL');
  } catch (error) {
    logger.error({
      event: 'extend_ttl_failed',
      tokenHash: tokenHash.substring(0, 8) + '...',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 'Failed to extend revocation TTL');

    throw error;
  }
}
