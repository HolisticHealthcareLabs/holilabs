/**
 * ElevenLabs TTS Server Helper
 *
 * Encapsulates all ElevenLabs vendor logic so the API route stays thin.
 * Supports persona-specific voice IDs for specialty-aware demo playback.
 */

import logger from '@/lib/logger';

const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9';
const TTS_TIMEOUT_MS = 15_000;

const LANG_CODE: Record<string, string> = {
  en: 'en-US',
  es: 'es-419',
  pt: 'pt-BR',
};

interface SpeakOptions {
  text: string;
  voiceId?: string;
  language?: string;
  stability?: number;
  similarityBoost?: number;
}

export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

export async function synthesizeSpeech(options: SpeakOptions): Promise<Response> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    language = 'es',
    stability = 0.45,
    similarityBoost = 0.8,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          language_code: LANG_CODE[language] ?? 'es-419',
          optimize_streaming_latency: 3,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        }),
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      logger.error({ event: 'elevenlabs_error', status: response.status, body: errBody });
      throw new Error(`ElevenLabs returned ${response.status}`);
    }

    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    logger.error({ event: 'elevenlabs_request_failed', isTimeout, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
