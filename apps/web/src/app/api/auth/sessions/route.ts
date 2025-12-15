/**
 * Session Management API Routes
 *
 * Endpoints:
 * - GET /api/auth/sessions - Get all active sessions for current user
 * - DELETE /api/auth/sessions/:id - Terminate a specific session
 * - DELETE /api/auth/sessions - Terminate all sessions (except current)
 *
 * @compliance HIPAA §164.312(a)(2)(iii) - Session controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionTrackingService } from '@/lib/auth/session-tracking';
import { getTokenRevocationService, RevocationReason } from '@/lib/auth/token-revocation';
import { auth } from '@/lib/auth/auth';
import { getServerSession } from '@/lib/auth';
import logger from '@/lib/logger';

/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get session - try patient auth first, then clinician auth
    let session = await auth();
    if (!session) {
      session = await getServerSession();
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to view sessions',
        },
        { status: 401 }
      );
    }

    const sessionService = getSessionTrackingService();
    const sessions = await sessionService.getUserSessions(session.user.id);

    // Format sessions for response
    const formattedSessions = sessions.map((s) => ({
      sessionId: s.sessionId,
      deviceInfo: {
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        fingerprint: s.deviceFingerprint.substring(0, 8) + '...', // Truncate for security
      },
      activity: {
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        expiresAt: s.expiresAt,
      },
      isCurrent: false, // We'll mark the current session in the frontend
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length,
    });
  } catch (error) {
    logger.error({
      event: 'get_sessions_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while retrieving sessions',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/sessions
 * Terminate all sessions except current
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get session
    let session = await auth();
    if (!session) {
      session = await getServerSession();
    }

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to manage sessions',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const sessionService = getSessionTrackingService();

    if (sessionId) {
      // Terminate specific session
      await sessionService.terminateSession(sessionId, RevocationReason.LOGOUT, {
        reason: 'User requested session termination',
      });

      logger.info({
        event: 'session_terminated_by_user',
        userId: session.user.id,
        sessionId,
      });

      return NextResponse.json({
        success: true,
        message: 'Session terminated successfully',
      });
    } else {
      // Terminate all sessions
      const count = await sessionService.terminateAllUserSessions(
        session.user.id,
        RevocationReason.LOGOUT
      );

      logger.info({
        event: 'all_sessions_terminated_by_user',
        userId: session.user.id,
        count,
      });

      return NextResponse.json({
        success: true,
        message: `${count} session(s) terminated successfully`,
        count,
      });
    }
  } catch (error) {
    logger.error({
      event: 'terminate_sessions_api_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while terminating sessions',
      },
      { status: 500 }
    );
  }
}
