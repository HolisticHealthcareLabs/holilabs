import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';

/**
 * Deepgram Token Endpoint
 *
 * Returns the Deepgram API key for WebSocket streaming.
 * Protected - requires authentication.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
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
