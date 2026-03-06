/**
 * TTS Proxy — ElevenLabs (MVP) / Browser fallback
 *
 * POST /api/tts/speak
 * Body: { text: string; voice: 'doctor' | 'patient'; language: 'en' | 'es' | 'pt' }
 *
 * Returns: audio/mpeg stream from ElevenLabs, or 501 if no API key is configured
 * (client falls back to browser speechSynthesis when this returns non-200).
 *
 * PHI note: text should be pre-filtered to exclude PHI segments before calling
 * this endpoint. The segment filtering in useTranscriptAudio already handles this.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

// Stable voice IDs — LATAM Spanish medical personas
// eleven_multilingual_v2 supports native Spanish output with any voice;
// these IDs are tuned for clinical LATAM Spanish (es-419) narration.
// Override via ELEVENLABS_VOICE_DOCTOR / ELEVENLABS_VOICE_PATIENT env vars.
const VOICE_IDS: Record<'doctor' | 'patient', string> = {
  doctor:  process.env.ELEVENLABS_VOICE_DOCTOR  ?? 'onwK4e9ZLuTAKqWW03F9', // Daniel — deep, neutral male
  patient: process.env.ELEVENLABS_VOICE_PATIENT ?? 'EXAVITQu4vr4xnSDxMaL', // Bella  — warm, conversational
};

type VoiceRole = keyof typeof VOICE_IDS;

interface SpeakBody {
  text:     string;
  voice?:   VoiceRole;
  language?: 'en' | 'es' | 'pt';
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Client falls back to browser speechSynthesis
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

  const { text, voice = 'doctor', language = 'es' } = body;

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  // Limit payload to prevent abuse
  if (text.length > 4096) {
    return NextResponse.json({ error: 'text too long (max 4096 chars)' }, { status: 400 });
  }

  const voiceId = VOICE_IDS[voice] ?? VOICE_IDS.doctor;

  // Map language to IETF LATAM variant for ElevenLabs language_code hint
  const langCode: Record<SpeakBody['language'] & string, string> = {
    en: 'en-US',
    es: 'es-419',  // LATAM Spanish — primary clinical target
    pt: 'pt-BR',
  };

  // Hard timeout circuit breaker — 15 s prevents isSyncing / spinner lockup.
  // If ElevenLabs doesn't respond within 15 s the request is aborted and the
  // client falls back to browser speechSynthesis.
  const TTS_TIMEOUT_MS = 15_000;
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'xi-api-key':   apiKey,
          'Content-Type': 'application/json',
          Accept:         'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id:                   'eleven_multilingual_v2',
          language_code:              langCode[language] ?? 'es-419',
          optimize_streaming_latency: 3,   // 0–4; 3 = aggressive latency reduction
          voice_settings: {
            stability:        0.45,
            similarity_boost: 0.80,
          },
        }),
      }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    console.error('[tts/speak] upstream error:', isTimeout ? 'TIMEOUT (15s)' : err);
    return NextResponse.json(
      {
        error:    isTimeout ? 'TTS request timed out (15 s)' : 'TTS upstream unreachable',
        fallback: 'browser',
      },
      { status: 504 }
    );
  }

  clearTimeout(timeoutId);

  if (!upstream.ok) {
    const err = await upstream.text();
    console.error('[tts/speak] ElevenLabs error:', upstream.status, err);
    return NextResponse.json(
      { error: 'TTS upstream error', fallback: 'browser' },
      { status: 502 }
    );
  }

  // Stream audio back to client — no buffering, pipe the ReadableStream directly
  // so the browser can start playing before the full response arrives.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type':              'audio/mpeg',
      'Cache-Control':             'no-store',
      'X-Content-Type-Options':    'nosniff',
      'Transfer-Encoding':         'chunked',
    },
  });
}
