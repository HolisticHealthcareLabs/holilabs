/**
 * Session Tracking Service
 *
 * Manages concurrent sessions, session limits, and session metadata.
 * Tracks active sessions with device information for security monitoring.
 *
 * @compliance HIPAA §164.312(a)(2)(iii) - Session controls
 * @compliance SOC 2 CC6.1 - Logical access controls
 */

import { prisma } from '@/lib/prisma';
import { getCacheClient } from '@/lib/cache/redis-client';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { getTokenRevocationService, RevocationReason } from './token-revocation';

/**
 * Session metadata
 */
export interface SessionMetadata {
  sessionId: string;
  userId: string;
  userType: 'CLINICIAN' | 'PATIENT';
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

/**
 * Session limits configuration
 */
export interface SessionLimits {
  maxConcurrentSessions: number;
  maxIdleMinutes: number;
  maxAbsoluteHours: number;
}

/**
 * Default session limits
 */
const DEFAULT_LIMITS: SessionLimits = {
  maxConcurrentSessions: 3,
  maxIdleMinutes: 15,
  maxAbsoluteHours: 8,
};

/**
 * Session Tracking Manager
 */
export class SessionTrackingService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user:sessions:';
  private redis = getCacheClient();
  private revocationService = getTokenRevocationService();

  /**
   * Generate a unique session ID
   */
  private generateSessionId(userId: string, timestamp: number): string {
    const data = `${userId}:${timestamp}:${crypto.randomBytes(16).toString('hex')}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate device fingerprint from user agent and IP
   */
  private generateDeviceFingerprint(ipAddress: string, userAgent: string): string {
    const data = `${ipAddress}:${userAgent}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    userType: 'CLINICIAN' | 'PATIENT',
    ipAddress: string,
    userAgent: string,
    token: string,
    limits: SessionLimits = DEFAULT_LIMITS
  ): Promise<SessionMetadata> {
    const now = new Date();
    const sessionId = this.generateSessionId(userId, now.getTime());
    const deviceFingerprint = this.generateDeviceFingerprint(ipAddress, userAgent);

    // Calculate expiration times
    const idleExpiresAt = new Date(now.getTime() + limits.maxIdleMinutes * 60 * 1000);
    const absoluteExpiresAt = new Date(now.getTime() + limits.maxAbsoluteHours * 60 * 60 * 1000);
    const expiresAt = new Date(Math.min(idleExpiresAt.getTime(), absoluteExpiresAt.getTime()));

    const session: SessionMetadata = {
      sessionId,
      userId,
      userType,
      ipAddress,
      userAgent,
      deviceFingerprint,
      createdAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // Store session data
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    await this.redis.set(sessionKey, session, ttlSeconds);

    // Track session for user
    await this.addUserSession(userId, sessionId, limits);

    // Track token for revocation
    await this.revocationService.trackUserToken(userId, token, ttlSeconds);

    logger.info({
      event: 'session_created',
      sessionId,
      userId,
      userType,
      deviceFingerprint,
      ipAddress,
      expiresAt: expiresAt.toISOString(),
    });

    return session;
  }

  /**
   * Add session to user's active sessions list and enforce limits
   */
  private async addUserSession(
    userId: string,
    sessionId: string,
    limits: SessionLimits
  ): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    try {
      // Get existing sessions
      const existingSessions = (await this.redis.get<string[]>(userSessionsKey)) || [];

      // Check if we're at the limit
      if (existingSessions.length >= limits.maxConcurrentSessions) {
        // Remove oldest session
        const oldestSessionId = existingSessions[0];
        const oldestSession = await this.getSession(oldestSessionId);

        if (oldestSession) {
          await this.terminateSession(
            oldestSessionId,
            RevocationReason.CONCURRENT_LIMIT,
            { reason: 'Maximum concurrent sessions exceeded' }
          );
        }

        // Remove from list
        existingSessions.shift();

        logger.info({
          event: 'session_limit_enforced',
          userId,
          removedSessionId: oldestSessionId,
          limit: limits.maxConcurrentSessions,
        });
      }

      // Add new session
      const updatedSessions = [...existingSessions, sessionId];

      // Store with TTL (use absolute timeout)
      const ttlSeconds = limits.maxAbsoluteHours * 60 * 60;
      await this.redis.set(userSessionsKey, updatedSessions, ttlSeconds);
    } catch (error) {
      logger.error({
        event: 'add_user_session_error',
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionMetadata | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    return await this.redis.get<SessionMetadata>(sessionKey);
  }

  /**
   * Update session activity (sliding window)
   */
  async updateSessionActivity(
    sessionId: string,
    limits: SessionLimits = DEFAULT_LIMITS
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      logger.warn({
        event: 'update_nonexistent_session',
        sessionId,
      });
      return;
    }

    const now = new Date();
    const createdAt = new Date(session.createdAt);
    const absoluteExpiresAt = new Date(
      createdAt.getTime() + limits.maxAbsoluteHours * 60 * 60 * 1000
    );
    const idleExpiresAt = new Date(now.getTime() + limits.maxIdleMinutes * 60 * 1000);

    // Use the earlier of the two expiration times
    const expiresAt = new Date(Math.min(idleExpiresAt.getTime(), absoluteExpiresAt.getTime()));

    // Update session
    session.lastActivityAt = now.toISOString();
    session.expiresAt = expiresAt.toISOString();

    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

    await this.redis.set(sessionKey, session, ttlSeconds);

    logger.debug({
      event: 'session_activity_updated',
      sessionId,
      userId: session.userId,
      expiresAt: expiresAt.toISOString(),
    });
  }

  /**
   * Validate session and check for hijacking
   */
  async validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    valid: boolean;
    session?: SessionMetadata;
    reason?: string;
  }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return {
        valid: false,
        reason: 'Session not found',
      };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      return {
        valid: false,
        reason: 'Session expired',
      };
    }

    // Check device fingerprint for session hijacking
    const currentFingerprint = this.generateDeviceFingerprint(ipAddress, userAgent);

    if (currentFingerprint !== session.deviceFingerprint) {
      logger.warn({
        event: 'session_hijacking_detected',
        sessionId,
        userId: session.userId,
        originalFingerprint: session.deviceFingerprint,
        currentFingerprint,
        originalIp: session.ipAddress,
        currentIp: ipAddress,
      });

      return {
        valid: false,
        session,
        reason: 'Device fingerprint mismatch - possible session hijacking',
      };
    }

    return {
      valid: true,
      session,
    };
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(
    sessionId: string,
    reason: RevocationReason,
    metadata?: { reason?: string; ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const session = await this.getSession(sessionId);

    if (!session) {
      logger.warn({
        event: 'terminate_nonexistent_session',
        sessionId,
      });
      return;
    }

    // Delete session
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    await this.redis.delete(sessionKey);

    // Remove from user's session list
    await this.removeUserSession(session.userId, sessionId);

    logger.info({
      event: 'session_terminated',
      sessionId,
      userId: session.userId,
      reason,
      metadata,
    });

    // Store termination in database for audit
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'SESSION_TERMINATED',
          resource: 'SESSION',
          resourceId: sessionId,
          details: {
            reason,
            metadata,
            sessionData: {
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              createdAt: session.createdAt,
              lastActivityAt: session.lastActivityAt,
            },
          },
          ipAddress: metadata?.ipAddress || session.ipAddress,
        },
      });
    } catch (error) {
      logger.error({
        event: 'session_termination_audit_error',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Remove session from user's active list
   */
  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    try {
      const existingSessions = (await this.redis.get<string[]>(userSessionsKey)) || [];
      const updatedSessions = existingSessions.filter((id) => id !== sessionId);

      if (updatedSessions.length > 0) {
        await this.redis.set(userSessionsKey, updatedSessions, 28800);
      } else {
        await this.redis.delete(userSessionsKey);
      }
    } catch (error) {
      logger.error({
        event: 'remove_user_session_error',
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionMetadata[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    try {
      const sessionIds = (await this.redis.get<string[]>(userSessionsKey)) || [];
      const sessions: SessionMetadata[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      logger.error({
        event: 'get_user_sessions_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Terminate all sessions for a user
   */
  async terminateAllUserSessions(
    userId: string,
    reason: RevocationReason,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<number> {
    const sessions = await this.getUserSessions(userId);

    for (const session of sessions) {
      await this.terminateSession(session.sessionId, reason, metadata);
    }

    logger.info({
      event: 'all_user_sessions_terminated',
      userId,
      count: sessions.length,
      reason,
    });

    return sessions.length;
  }

  /**
   * Cleanup expired sessions (maintenance task)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // This is automatically handled by Redis TTL
      // This method is here for manual cleanup if needed
      const pattern = `${this.SESSION_PREFIX}*`;
      const deleted = await this.redis.deletePattern(pattern);

      logger.info({
        event: 'sessions_cleanup',
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
let sessionTrackingServiceInstance: SessionTrackingService | null = null;

/**
 * Get or create session tracking service (singleton)
 */
export function getSessionTrackingService(): SessionTrackingService {
  if (!sessionTrackingServiceInstance) {
    sessionTrackingServiceInstance = new SessionTrackingService();
  }
  return sessionTrackingServiceInstance;
}
