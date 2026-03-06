'use client';

/**
 * useMicrophoneSTT — Real-time speech-to-text via Deepgram Nova-2 Medical
 *
 * Architecture:
 *  1. Browser MediaRecorder captures audio from the microphone
 *  2. Recorded chunks are uploaded to POST /api/scribe/sessions/{id}/audio
 *  3. Finalize fires POST /api/scribe/sessions/{id}/finalize
 *  4. Transcription arrives via polling GET /api/scribe/sessions/{id}
 *
 * Gracefully degrades (no-op) when MediaDevices is unavailable (SSR / JSDOM).
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export type STTLanguage = 'en' | 'es' | 'pt';

interface UseMicrophoneSTTOptions {
  onTranscript: (text: string) => void;
  language?: STTLanguage;
  enabled?: boolean;
}

export interface UseMicrophoneSTTReturn {
  isListening:    boolean;
  startListening: () => Promise<void>;
  stopListening:  () => void;
  error:          string | null;
  isSupported:    boolean;
}

// Poll interval for fetching final transcript (ms)
const POLL_INTERVAL_MS = 1500;

export function useMicrophoneSTT({
  onTranscript,
  language = 'en',
  enabled = true,
}: UseMicrophoneSTTOptions): UseMicrophoneSTTReturn {
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices;

  const [isListening, setIsListening] = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const sessionIdRef      = useRef<string | null>(null);
  const pollTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardTimeoutRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkIndexRef     = useRef(0);

  // ── Shared cleanup for poll timer + hard timeout ──────────────────────────
  function clearPollAndTimeout() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current);
      hardTimeoutRef.current = null;
    }
  }

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create a new scribe session ───────────────────────────────────────────
  async function createSession(): Promise<string> {
    const res = await fetch('/api/scribe/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ language, model: 'nova-2-medical' }),
    });
    if (!res.ok) throw new Error(`Session create failed: ${res.status}`);
    const data = await res.json() as { id: string };
    return data.id;
  }

  // ── Upload a single audio chunk ───────────────────────────────────────────
  async function uploadChunk(sessionId: string, blob: Blob, index: number) {
    const form = new FormData();
    form.append('audio', blob, `chunk-${index}.webm`);
    form.append('chunkIndex', String(index));

    await fetch(`/api/scribe/sessions/${sessionId}/audio`, {
      method: 'POST',
      body:   form,
    });
  }

  // ── Poll session for transcript results ───────────────────────────────────
  async function pollSession(sessionId: string) {
    try {
      const res = await fetch(`/api/scribe/sessions/${sessionId}`);
      if (!res.ok) return;

      const data = await res.json() as { transcript?: string; status?: string };

      if (data.transcript) {
        onTranscript(data.transcript);
      }

      // Stop polling when session is finalized — also disarms the hard timeout
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        clearPollAndTimeout();
      }
    } catch {
      // Network errors during polling are non-fatal
    }
  }

  // ── startListening ────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!isSupported || !enabled || isListening) return;

    setError(null);

    try {
      // 1. Create backend session
      const sessionId = await createSession();
      sessionIdRef.current  = sessionId;
      chunkIndexRef.current = 0;

      // 2. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Start MediaRecorder — emit chunks every 2s
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0 && sessionIdRef.current) {
          uploadChunk(sessionIdRef.current, e.data, chunkIndexRef.current++).catch(console.error);
        }
      };

      recorder.start(2000); // collect 2-second chunks
      setIsListening(true);

      // 4. Begin polling for transcript
      pollTimerRef.current = setInterval(() => {
        if (sessionIdRef.current) pollSession(sessionIdRef.current);
      }, POLL_INTERVAL_MS);

      // 5. Hard timeout circuit breaker — 15 s
      // If the backend never returns COMPLETED/FAILED within 15 s, force-reset.
      const STT_HARD_TIMEOUT_MS = 15_000;
      hardTimeoutRef.current = setTimeout(() => {
        clearPollAndTimeout();
        setIsListening(false);
        setError('STT did not respond within 15 s — microphone stopped automatically. Please try again.');
        // Release mic so the browser indicator light goes off
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      }, STT_HARD_TIMEOUT_MS);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
      console.error('[useMicrophoneSTT] startListening error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, enabled, isListening, language]);

  // ── stopListening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    // Disarm poll timer and hard-timeout circuit breaker
    clearPollAndTimeout();

    // Stop recorder + collect final chunk
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.requestData();
      recorder.stop();
    }
    mediaRecorderRef.current = null;

    // Release mic track
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    // Finalize session (fire-and-forget)
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      fetch(`/api/scribe/sessions/${sessionId}/finalize`, { method: 'POST' }).catch(console.error);
      sessionIdRef.current = null;
    }

    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening, error, isSupported };
}
