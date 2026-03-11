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
import { createProtectedRoute } from '@/lib/api/middleware';
import logger from '@/lib/logger';
import { z } from 'zod';
import { auditCreate } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const TokenRequestSchema = z.object({
  roomId: z.string().min(1, 'roomId is required'),
  userName: z.string().min(1, 'userName is required'),
  userType: z.enum(['clinician', 'patient']),
});

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://localhost:7880';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const start = performance.now();
    const userId = context.user!.id;

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

    const identity = `${userType}_${userId}`;
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name: userName,
      ttl: '2h',
    });

    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomRecord: userType === 'clinician',
      roomAdmin: userType === 'clinician',
    });

    const token = await at.toJwt();

    const elapsed = performance.now() - start;

    logger.info({
      event: 'livekit_token_generated',
      roomId,
      userType,
      userId,
      identity,
      latencyMs: elapsed.toFixed(2),
    });

    await auditCreate('VideoToken', roomId, request, {
      action: 'video_token_generated',
      roomId,
      userType,
      userId,
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
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    allowPatientAuth: true,
  }
);
