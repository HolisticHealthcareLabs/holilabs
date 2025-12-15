/**
 * Session Security Middleware
 *
 * Implements session hijacking protection by validating device fingerprints
 * and monitoring suspicious session activity.
 *
 * @compliance HIPAA §164.312(a)(2)(i) - Unique user identification
 * @compliance SOC 2 CC6.1 - Logical access controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionTrackingService } from './session-tracking';
import { getTokenRevocationService, RevocationReason } from './token-revocation';
import logger from '@/lib/logger';
import crypto from 'crypto';

/**
 * Extract IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown';
}

/**
 * Generate device fingerprint from request
 */
export function generateDeviceFingerprint(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const data = `${ip}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Validate session security
 * Checks for session hijacking and suspicious activity
 */
export async function validateSessionSecurity(
  request: NextRequest,
  sessionId: string,
  userId: string
): Promise<{
  valid: boolean;
  reason?: string;
  shouldTerminate?: boolean;
}> {
  const sessionService = getSessionTrackingService();
  const revocationService = getTokenRevocationService();

  try {
    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    // Validate session
    const validation = await sessionService.validateSession(sessionId, ipAddress, userAgent);

    if (!validation.valid) {
      logger.warn({
        event: 'session_validation_failed',
        sessionId,
        userId,
        reason: validation.reason,
        ipAddress,
      });

      // Terminate session if hijacking detected
      if (validation.reason?.includes('hijacking')) {
        await sessionService.terminateSession(sessionId, RevocationReason.SUSPICIOUS_ACTIVITY, {
          reason: validation.reason,
          ipAddress,
          userAgent,
        });

        return {
          valid: false,
          reason: validation.reason,
          shouldTerminate: true,
        };
      }

      return {
        valid: false,
        reason: validation.reason,
      };
    }

    // Check for geographic anomalies (optional - requires IP geolocation)
    // This is a placeholder for future enhancement
    const geoAnomaly = await checkGeographicAnomaly(sessionId, ipAddress);
    if (geoAnomaly.isSuspicious) {
      logger.warn({
        event: 'geographic_anomaly_detected',
        sessionId,
        userId,
        ipAddress,
        details: geoAnomaly,
      });

      // Don't terminate, but log for review
      // In a production system, you might want to require re-authentication
    }

    // Update session activity (sliding window)
    await sessionService.updateSessionActivity(sessionId);

    return {
      valid: true,
    };
  } catch (error) {
    logger.error({
      event: 'session_security_error',
      sessionId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Fail open on error to prevent service disruption
    return {
      valid: true,
    };
  }
}

/**
 * Check for geographic anomalies in session
 * Placeholder for future IP geolocation integration
 */
async function checkGeographicAnomaly(
  sessionId: string,
  ipAddress: string
): Promise<{
  isSuspicious: boolean;
  reason?: string;
}> {
  // TODO: Implement IP geolocation check
  // Compare current IP location with previous session locations
  // Flag if location changed by >500 miles in <1 hour

  return {
    isSuspicious: false,
  };
}

/**
 * Monitor failed authentication attempts
 */
export class AuthenticationMonitor {
  private static readonly FAILED_ATTEMPTS_PREFIX = 'auth:failed:';
  private static readonly MAX_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60; // 15 minutes

  /**
   * Record failed authentication attempt
   */
  static async recordFailedAttempt(
    identifier: string, // email or phone
    ipAddress: string
  ): Promise<{
    attempts: number;
    isLocked: boolean;
    lockoutEndsAt?: Date;
  }> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.FAILED_ATTEMPTS_PREFIX}${identifier}`;

      // Get current attempts
      const current = (await redis.get<{ count: number; lockedUntil?: string }>(key)) || {
        count: 0,
      };

      // Check if still locked
      if (current.lockedUntil) {
        const lockedUntil = new Date(current.lockedUntil);
        if (new Date() < lockedUntil) {
          logger.warn({
            event: 'auth_attempt_while_locked',
            identifier,
            ipAddress,
            lockedUntil,
          });

          return {
            attempts: current.count,
            isLocked: true,
            lockoutEndsAt: lockedUntil,
          };
        }
      }

      // Increment attempts
      const newCount = current.count + 1;
      const isLocked = newCount >= this.MAX_ATTEMPTS;

      const data: { count: number; lockedUntil?: string } = {
        count: newCount,
      };

      if (isLocked) {
        const lockoutEndsAt = new Date(Date.now() + this.LOCKOUT_DURATION * 1000);
        data.lockedUntil = lockoutEndsAt.toISOString();

        logger.warn({
          event: 'account_locked',
          identifier,
          ipAddress,
          attempts: newCount,
          lockoutEndsAt,
        });

        // Store with lockout duration TTL
        await redis.set(key, data, this.LOCKOUT_DURATION);

        return {
          attempts: newCount,
          isLocked: true,
          lockoutEndsAt,
        };
      }

      // Store with 1 hour TTL
      await redis.set(key, data, 3600);

      logger.info({
        event: 'failed_auth_attempt_recorded',
        identifier,
        ipAddress,
        attempts: newCount,
      });

      return {
        attempts: newCount,
        isLocked: false,
      };
    } catch (error) {
      logger.error({
        event: 'record_failed_attempt_error',
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fail open on error
      return {
        attempts: 0,
        isLocked: false,
      };
    }
  }

  /**
   * Check if account is locked
   */
  static async isLocked(identifier: string): Promise<{
    isLocked: boolean;
    lockoutEndsAt?: Date;
    attempts?: number;
  }> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.FAILED_ATTEMPTS_PREFIX}${identifier}`;

      const data = await redis.get<{ count: number; lockedUntil?: string }>(key);

      if (!data || !data.lockedUntil) {
        return { isLocked: false };
      }

      const lockedUntil = new Date(data.lockedUntil);

      if (new Date() >= lockedUntil) {
        // Lockout expired
        await redis.delete(key);
        return { isLocked: false };
      }

      return {
        isLocked: true,
        lockoutEndsAt: lockedUntil,
        attempts: data.count,
      };
    } catch (error) {
      logger.error({
        event: 'check_lockout_error',
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fail open on error
      return { isLocked: false };
    }
  }

  /**
   * Clear failed attempts (on successful authentication)
   */
  static async clearFailedAttempts(identifier: string): Promise<void> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.FAILED_ATTEMPTS_PREFIX}${identifier}`;

      await redis.delete(key);

      logger.debug({
        event: 'failed_attempts_cleared',
        identifier,
      });
    } catch (error) {
      logger.error({
        event: 'clear_failed_attempts_error',
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Manually unlock account (admin function)
   */
  static async unlockAccount(identifier: string, adminUserId: string): Promise<void> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.FAILED_ATTEMPTS_PREFIX}${identifier}`;

      await redis.delete(key);

      logger.info({
        event: 'account_unlocked',
        identifier,
        adminUserId,
      });
    } catch (error) {
      logger.error({
        event: 'unlock_account_error',
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Rate limit password reset requests
 */
export class PasswordResetRateLimiter {
  private static readonly RESET_REQUEST_PREFIX = 'password:reset:';
  private static readonly MAX_REQUESTS = 3;
  private static readonly WINDOW_SECONDS = 3600; // 1 hour

  /**
   * Check if password reset is allowed
   */
  static async checkRateLimit(email: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt?: Date;
  }> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.RESET_REQUEST_PREFIX}${email}`;

      const current = (await redis.get<{ count: number; firstRequest: string }>(key)) || {
        count: 0,
        firstRequest: new Date().toISOString(),
      };

      const firstRequest = new Date(current.firstRequest);
      const now = new Date();
      const windowEndTime = new Date(firstRequest.getTime() + this.WINDOW_SECONDS * 1000);

      // Check if window expired
      if (now >= windowEndTime) {
        // Reset counter
        await redis.delete(key);
        return {
          allowed: true,
          remaining: this.MAX_REQUESTS - 1,
        };
      }

      // Check limit
      if (current.count >= this.MAX_REQUESTS) {
        logger.warn({
          event: 'password_reset_rate_limit_exceeded',
          email,
          count: current.count,
        });

        return {
          allowed: false,
          remaining: 0,
          resetAt: windowEndTime,
        };
      }

      return {
        allowed: true,
        remaining: this.MAX_REQUESTS - current.count - 1,
      };
    } catch (error) {
      logger.error({
        event: 'password_reset_rate_limit_error',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fail open on error
      return {
        allowed: true,
        remaining: this.MAX_REQUESTS,
      };
    }
  }

  /**
   * Record password reset request
   */
  static async recordRequest(email: string): Promise<void> {
    try {
      const { getCacheClient } = await import('@/lib/cache/redis-client');
      const redis = getCacheClient();
      const key = `${this.RESET_REQUEST_PREFIX}${email}`;

      const current = (await redis.get<{ count: number; firstRequest: string }>(key)) || {
        count: 0,
        firstRequest: new Date().toISOString(),
      };

      const updated = {
        count: current.count + 1,
        firstRequest: current.firstRequest,
      };

      await redis.set(key, updated, this.WINDOW_SECONDS);

      logger.info({
        event: 'password_reset_request_recorded',
        email,
        count: updated.count,
      });
    } catch (error) {
      logger.error({
        event: 'record_reset_request_error',
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
