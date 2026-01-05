import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

/**
 * Deepgram Token Endpoint
 *
 * Returns the Deepgram API key for WebSocket streaming.
 * Protected - requires authentication.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Deepgram API key from environment
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      console.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 500 }
      );
    }

    // HIPAA Audit Log: Transcription service token accessed
    await createAuditLog({
      userId: session.user.id,
      userEmail: session.user.email || 'unknown',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      action: 'ACCESS',
      resource: 'TranscriptionService',
      resourceId: 'deepgram_token',
      details: {
        service: 'deepgram',
        accessType: 'TOKEN_REQUEST',
      },
      success: true,
      request,
    });

    return NextResponse.json({
      token: apiKey,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching Deepgram token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
