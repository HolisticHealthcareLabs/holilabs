/**
 * Deepgram Live Health Check Endpoint
 *
 * GET /api/health/deepgram-live
 * Tries a minimal live websocket handshake and reports whether the account/token supports it.
 *
 * NOTE: This does NOT transmit audio. It only opens the websocket and then closes it.
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { MedicalAudioStreamer } from '@/lib/transcription/MedicalAudioStreamer';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function GET() {
  if (!process.env.DEEPGRAM_API_KEY) {
    return NextResponse.json({ ok: false, error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
  }

  // Prefer "en" because it's the most commonly enabled baseline for medical accounts.
  const streamer = new MedicalAudioStreamer({
    apiKey: process.env.DEEPGRAM_API_KEY,
    language: 'en',
    // Keep it minimal; we only want to validate live access.
    // If this fails, no live config will succeed.
    modelOverride: 'nova-2',
    tag: { clinic_id: 'local', user_id: 'healthcheck', env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev' },
    // Avoid keywords entirely for the probe.
    patientContext: [],
    logger,
  } as any);

  return await new Promise<Response>((resolve) => {
    const timeout = setTimeout(async () => {
      try {
        await streamer.stop();
      } catch {}
      resolve(
        NextResponse.json(
          { ok: false, status: 'timeout', message: 'Deepgram live handshake did not open within 8s' },
          { status: 504 }
        )
      );
    }, 8000);

    streamer.once('open', async ({ requestId, model }: any) => {
      clearTimeout(timeout);
      try {
        await streamer.stop();
      } catch {}
      resolve(
        NextResponse.json({
          ok: true,
          status: 'healthy',
          requestId,
          model,
          message: 'Deepgram live websocket handshake succeeded',
        })
      );
    });

    streamer.once('error', async ({ message, raw }: any) => {
      clearTimeout(timeout);
      try {
        await streamer.stop();
      } catch {}
      resolve(
        NextResponse.json(
          {
            ok: false,
            status: 'error',
            message: message || 'Deepgram live handshake failed',
            detail: raw?.message || raw || undefined,
          },
          { status: 500 }
        )
      );
    });

    streamer.startStream().catch(async (e: any) => {
      clearTimeout(timeout);
      try {
        await streamer.stop();
      } catch {}
      resolve(
        NextResponse.json(
          { ok: false, status: 'error', message: e?.message || 'Failed to start live streamer' },
          { status: 500 }
        )
      );
    });
  });
}


