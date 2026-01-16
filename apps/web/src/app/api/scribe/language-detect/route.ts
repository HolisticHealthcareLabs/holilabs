import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createClient } from '@deepgram/sdk';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest) => {
    return NextResponse.json({
      ok: true,
      message:
        'Use POST with Content-Type: application/octet-stream and a raw PCM16 mono payload. This endpoint is called automatically by the Co-Pilot when Speech language is set to Auto.',
    });
  },
  { skipCsrf: true }
);

function pcm16ToWav(pcm16: Buffer, sampleRate: number, channels: number) {
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcm16.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // PCM
  wavHeader.writeUInt16LE(1, 20); // AudioFormat = PCM
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(16, 34); // bits per sample
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcm16.length, 40);

  return Buffer.concat([wavHeader, pcm16]);
}

function mapDetectedLanguage(raw: string | undefined): 'en' | 'es' | 'pt' {
  if (!raw) return 'en';
  const v = raw.toLowerCase();
  if (v.startsWith('es')) return 'es';
  if (v.startsWith('pt')) return 'pt';
  return 'en';
}

/**
 * POST /api/scribe/language-detect
 *
 * Body: raw PCM16 mono (little-endian) @ sampleRate (default 16000).
 * Returns: { language: 'en'|'es'|'pt', raw, confidence? }
 */
export const POST = createProtectedRoute(
  async (request: NextRequest) => {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPGRAM_API_KEY not configured' }, { status: 500 });
    }

    const sampleRate = Number(new URL(request.url).searchParams.get('sampleRate') || 16000);
    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      return NextResponse.json({ error: 'Invalid sampleRate' }, { status: 400 });
    }

    const ab = await request.arrayBuffer();
    const pcm = Buffer.from(ab);

    // Keep this small: we only need a short snippet to detect language.
    if (pcm.length < 8000) {
      return NextResponse.json({ language: 'en', raw: 'too_short' });
    }
    if (pcm.length > 200_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const deepgram = createClient(apiKey);
    const wav = pcm16ToWav(pcm, sampleRate, 1);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(wav, {
      model: 'nova-2',
      detect_language: true,
      smart_format: false,
      punctuate: false,
      diarize: false,
      utterances: false,
    } as any);

    if (error) {
      return NextResponse.json(
        { error: 'Deepgram error', details: error.message },
        { status: 502 }
      );
    }
    if (!result) {
      return NextResponse.json({ error: 'Deepgram returned empty result' }, { status: 502 });
    }

    const rawDetected =
      (result as any)?.metadata?.detected_language ??
      (result as any)?.results?.channels?.[0]?.detected_language ??
      (result as any)?.results?.channels?.[0]?.alternatives?.[0]?.detected_language ??
      (result as any)?.results?.channels?.[0]?.alternatives?.[0]?.language;

    const confidence =
      (result as any)?.metadata?.language_confidence ??
      (result as any)?.results?.channels?.[0]?.language_confidence ??
      (result as any)?.results?.channels?.[0]?.alternatives?.[0]?.language_confidence;

    const language = mapDetectedLanguage(rawDetected);

    return NextResponse.json({
      language,
      raw: rawDetected ?? null,
      confidence: typeof confidence === 'number' ? confidence : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
},
  // This endpoint is same-origin but uses binary POST from the browser; we skip CSRF
  // while still requiring auth via createProtectedRoute().
  { skipCsrf: true }
);


