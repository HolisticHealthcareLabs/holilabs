/**
 * LiveKit Token Generation API
 *
 * POST /api/video/token
 * Generates JWT tokens for LiveKit video room authentication.
 * Supports both clinicians and patients with appropriate permissions.
 *
 * Request Body:
 * - roomId: string (required) - Appointment/room ID
 * - userName: string (required) - Display name
 * - userType: 'clinician' | 'patient' (required) - User role
 *
 * Phase: Telehealth Video Integration (OSS: LiveKit)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Request validation schema
const TokenRequestSchema = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  userName: z.string().min(1, 'userName is required'),
  userType: z.enum(['clinician', 'patient']),
});

// LiveKit configuration from environment
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://localhost:7880';

/**
 * POST /api/video/token
 * Generate LiveKit access token for video room
 */
export async function POST(request: NextRequest) {
  const start = performance.now();

  try {
    // Verify authentication
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Validate LiveKit configuration
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      logger.error({
        event: 'livekit_config_missing',
        hasApiKey: !!LIVEKIT_API_KEY,
        hasApiSecret: !!LIVEKIT_API_SECRET,
      });

      return NextResponse.json(
        { error: 'Video service not configured' },
        { status: 503 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = TokenRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { roomId, userName, userType } = validation.data;

    // Create access token with identity based on session + userType
    const identity = `${userType}_${session.user.id}`;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: userName,
      ttl: '2h', // Token valid for 2 hours
    });

    // Grant room access with permissions based on user type
    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      // Clinicians can record and manage participants
      canPublishData: true,
      roomRecord: userType === 'clinician',
      roomAdmin: userType === 'clinician',
    });

    // Generate token
    const token = await at.toJwt();

    const elapsed = performance.now() - start;

    logger.info({
      event: 'livekit_token_generated',
      roomId,
      userType,
      userId: session.user.id,
      identity,
      latencyMs: elapsed.toFixed(2),
    });

    // HIPAA Audit
    await auditCreate('VideoToken', roomId, request, {
      action: 'video_token_generated',
      roomId,
      userType,
      userId: session.user.id,
      identity,
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        url: LIVEKIT_URL,
        roomId,
        identity,
      },
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'livekit_token_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to generate video token',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
