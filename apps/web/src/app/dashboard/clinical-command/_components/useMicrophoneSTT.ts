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
import {
  offlineAudioQueue,
  type OfflineAudioOperation,
} from '@/lib/scribe/offline-audio-queue';

export type STTLanguage = 'en' | 'es' | 'pt';

interface UseMicrophoneSTTOptions {
  onTranscript: (text: string) => void;
  language?: STTLanguage;
  enabled?: boolean;
  patientId?: string | null;
}

export interface UseMicrophoneSTTReturn {
  isListening:    boolean;
  startListening: () => Promise<void>;
  stopListening:  () => void;
  error:          string | null;
  isSupported:    boolean;
}

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45_000;

export function useMicrophoneSTT({
  onTranscript,
  language = 'en',
  enabled = true,
  patientId = null,
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
  const chunkIndexRef     = useRef(0);
  const isMountedRef      = useRef(true);
  const isFlushingRef     = useRef(false);
  const deliveredSessionsRef = useRef<Set<string>>(new Set());

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Create a new scribe session ───────────────────────────────────────────
  async function createSession(): Promise<string> {
    if (!patientId) {
      throw new Error('Select a patient before starting voice capture');
    }

    const res = await fetch('/api/scribe/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        language,
        model: 'nova-2-medical',
        patientId,
        accessReason: 'DIRECT_PATIENT_CARE',
        accessPurpose: 'CDSS_VOICE_COMMAND',
      }),
    });
    if (!res.ok) throw new Error(`Session create failed: ${res.status}`);
    const payload = await res.json() as { id?: string; data?: { id?: string } };
    const id = payload.data?.id ?? payload.id;
    if (!id) throw new Error('Session create failed: invalid response');
    return id;
  }

  // ── Upload a single audio chunk ───────────────────────────────────────────
  async function uploadChunk(sessionId: string, blob: Blob, index: number): Promise<void> {
    const form = new FormData();
    form.append('audio', blob, `chunk-${index}.webm`);
    form.append('chunkIndex', String(index));

    const response = await fetch(`/api/scribe/sessions/${sessionId}/audio`, {
      method: 'POST',
      body:   form,
    });
    if (!response.ok) {
      throw new Error(`Audio upload failed (${response.status})`);
    }
  }

  async function finalizeSession(sessionId: string): Promise<void> {
    const response = await fetch(`/api/scribe/sessions/${sessionId}/finalize`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Session finalize failed (${response.status})`);
    }
  }

  async function pollSessionUntilComplete(sessionId: string): Promise<void> {
    if (deliveredSessionsRef.current.has(sessionId)) return;
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      if (!isMountedRef.current) return;
      if (!navigator.onLine) return;

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      if (!isMountedRef.current) return;

      await tryFetchTranscript(sessionId);
      if (deliveredSessionsRef.current.has(sessionId)) return;
    }
  }

  async function tryFetchTranscript(sessionId: string): Promise<void> {
    try {
      const res = await fetch(`/api/scribe/sessions/${sessionId}`);
      if (!res.ok) return;

      const payload = await res.json() as {
        transcript?: string;
        status?: string;
        data?: {
          status?: string;
          transcript?: string;
          transcription?: {
            rawText?: string;
          };
        };
      };

      const status = payload.data?.status ?? payload.status;
      const transcript =
        payload.data?.transcription?.rawText ??
        payload.data?.transcript ??
        payload.transcript;

      if (transcript && !deliveredSessionsRef.current.has(sessionId)) {
        deliveredSessionsRef.current.add(sessionId);
        onTranscript(transcript);
      }

      if (status === 'FAILED') {
        deliveredSessionsRef.current.add(sessionId);
      }
    } catch {
      // Network errors are expected during unstable connectivity.
    }
  }

  const processOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    if (isFlushingRef.current) return;

    isFlushingRef.current = true;

    try {
      const ops = await offlineAudioQueue.getRunnableOperations();
      for (const op of ops) {
        if (!navigator.onLine) break;
        await processOperation(op);
      }
      await offlineAudioQueue.pruneCompleted().catch(() => {});
    } finally {
      isFlushingRef.current = false;
    }
  }, [onTranscript]);

  const processOperation = useCallback(async (op: OfflineAudioOperation): Promise<void> => {
    try {
      if (op.kind === 'audio_chunk') {
        await uploadChunk(op.sessionId, op.audioBlob, op.chunkIndex);
        await offlineAudioQueue.markCompleted(op.id);
        return;
      }

      const hasPendingChunks = await offlineAudioQueue.hasPendingSessionOperations(op.sessionId);
      if (hasPendingChunks) return;

      await finalizeSession(op.sessionId);
      await pollSessionUntilComplete(op.sessionId);
      await offlineAudioQueue.markCompleted(op.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      await offlineAudioQueue.markRetry(op.id, message);
      if (isMountedRef.current) setError(message);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOnline = () => {
      if (isMountedRef.current) setError(null);
      void processOfflineQueue();
    };

    window.addEventListener('online', onOnline);

    if (navigator.onLine) {
      void processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [processOfflineQueue]);

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
          offlineAudioQueue.enqueueChunk({
            sessionId: sessionIdRef.current,
            chunkIndex: chunkIndexRef.current++,
            audioBlob: e.data,
            mimeType,
          }).then(() => {
            if (navigator.onLine) {
              void processOfflineQueue();
            }
          }).catch((queueErr) => {
            const message = queueErr instanceof Error ? queueErr.message : 'Failed to queue audio chunk';
            if (isMountedRef.current) setError(message);
          });
        }
      };

      recorder.start(2000); // collect 2-second chunks
      setIsListening(true);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
      console.error('[useMicrophoneSTT] startListening error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, enabled, isListening, language, patientId, processOfflineQueue]);

  // ── stopListening ─────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    const sessionId = sessionIdRef.current;
    const recorder = mediaRecorderRef.current;

    if (sessionId && recorder && recorder.state !== 'inactive') {
      recorder.onstop = () => {
        void offlineAudioQueue.enqueueFinalize({ sessionId }).then(() => {
          if (navigator.onLine) {
            void processOfflineQueue();
          }
        }).catch((queueErr) => {
          const message = queueErr instanceof Error ? queueErr.message : 'Failed to queue finalize request';
          if (isMountedRef.current) setError(message);
        });
      };
      recorder.requestData();
      recorder.stop();
    } else if (sessionId) {
      void offlineAudioQueue.enqueueFinalize({ sessionId }).then(() => {
        if (navigator.onLine) {
          void processOfflineQueue();
        }
      }).catch((queueErr) => {
        const message = queueErr instanceof Error ? queueErr.message : 'Failed to queue finalize request';
        if (isMountedRef.current) setError(message);
      });
    }

    mediaRecorderRef.current = null;

    // Release mic track
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    sessionIdRef.current = null;

    setIsListening(false);
  }, [processOfflineQueue]);

  return {
    isListening,
    startListening,
    stopListening,
    error,
    isSupported,
  };
}
