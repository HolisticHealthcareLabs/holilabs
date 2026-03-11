import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';

/**
 * Deepgram Token Endpoint
 *
 * SECURITY NOTE:
 * Never return long-lived vendor API keys to browsers in production.
 *
 * This route is deprecated and disabled by default. If you have an explicit,
 * approved need for browser → Deepgram (rare), set:
 * - ALLOW_DEEPGRAM_BROWSER_TOKEN=true
 * and only use it in controlled environments.
 */

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const allowBrowserToken =
      String(process.env.ALLOW_DEEPGRAM_BROWSER_TOKEN || '').toLowerCase() === 'true';

    if (!allowBrowserToken) {
      return NextResponse.json(
        {
          error: 'Deepgram browser token endpoint is disabled',
          message:
            'Use server-mediated transcription. If you must enable this for a controlled environment, set ALLOW_DEEPGRAM_BROWSER_TOKEN=true.',
        },
        { status: 410 }
      );
    }

    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      console.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 500 }
      );
    }

    await createAuditLog({
      action: 'ACCESS',
      resource: 'TranscriptionService',
      resourceId: 'deepgram_token',
      details: {
        service: 'deepgram',
        accessType: 'TOKEN_REQUEST',
      },
      success: true,
    });

    return NextResponse.json({
      token: apiKey,
      success: true,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
