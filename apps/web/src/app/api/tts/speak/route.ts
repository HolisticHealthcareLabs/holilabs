/**
 * TTS Proxy — ElevenLabs (persona-aware) / Browser fallback
 *
 * POST /api/tts/speak
 * Body: { text: string; voice?: 'doctor' | 'patient'; voiceId?: string; language?: 'en' | 'es' | 'pt' }
 *
 * If voiceId is provided (from persona metadata), it takes precedence over the voice role mapping.
 * Returns: audio/mpeg stream from ElevenLabs, or 501 if no API key is configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { isElevenLabsConfigured, synthesizeSpeech } from '@/lib/voice/elevenlabs';

export const dynamic = 'force-dynamic';

const ROLE_VOICE_IDS: Record<string, string> = {
  doctor: process.env.ELEVENLABS_VOICE_DOCTOR ?? 'onwK4e9ZLuTAKqWW03F9',
  patient: process.env.ELEVENLABS_VOICE_PATIENT ?? 'EXAVITQu4vr4xnSDxMaL',
};

interface SpeakBody {
  text: string;
  voice?: string;
  voiceId?: string;
  language?: 'en' | 'es' | 'pt';
}

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    if (!isElevenLabsConfigured()) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured', fallback: 'browser' },
        { status: 501 }
      );
    }

    let body: SpeakBody;
    try {
      body = (await request.json()) as SpeakBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { text, voice = 'doctor', voiceId, language = 'es' } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    if (text.length > 4096) {
      return NextResponse.json({ error: 'text too long (max 4096 chars)' }, { status: 400 });
    }

    const resolvedVoiceId = voiceId || ROLE_VOICE_IDS[voice] || ROLE_VOICE_IDS.doctor;

    try {
      const upstream = await synthesizeSpeech({
        text,
        voiceId: resolvedVoiceId,
        language,
      });

      return new NextResponse(upstream.body, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Transfer-Encoding': 'chunked',
        },
      });
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      return NextResponse.json(
        {
          error: isTimeout ? 'TTS request timed out (15 s)' : 'TTS upstream error',
          fallback: 'browser',
        },
        { status: isTimeout ? 504 : 502 }
      );
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
  }
);
