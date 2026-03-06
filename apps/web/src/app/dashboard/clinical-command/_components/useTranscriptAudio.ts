'use client';

/**
 * useTranscriptAudio — Multi-lingual ambient audio playback engine
 *
 * Priority chain:
 *  1. ElevenLabs /api/tts/speak  (high-fidelity, eleven_multilingual_v2)
 *     → streamed via MediaSource API into an <audio> element.
 *     → 15-second hard-timeout circuit breaker: if the stream hasn't started
 *       within 15 s the loading state is forced to false, an error is emitted,
 *       and playback falls through to tier 2.
 *  2. Browser speechSynthesis    (zero-latency fallback, no API key needed)
 *
 * PHI policy: `phi` segments are NEVER passed to either audio engine.
 * The caller is responsible for pre-filtering if needed; this hook skips
 * all segments where `seg.kind === 'phi'` unconditionally.
 *
 * Gracefully degrades to a no-op when both engines are unavailable
 * (SSR, JSDOM, restrictive browser sandbox).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Segment } from './TranscriptPane';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AudioLanguage = 'en' | 'es' | 'pt';

interface UseTranscriptAudioOptions {
  segments:   Segment[];
  language?:  AudioLanguage;
  /**
   * Set to false to silence playback without destroying the hook
   * (e.g. while recording is paused between attempts).
   */
  active: boolean;
  /** Called when the ElevenLabs circuit breaker trips or the stream errors. */
  onError?: (message: string) => void;
}

export interface UseTranscriptAudioReturn {
  /** True while the ElevenLabs fetch is in-flight (before audio bytes arrive). */
  isLoading:  boolean;
  /** User-controlled mute state — toggled via the speaker button. */
  isMuted:    boolean;
  toggleMute: () => void;
  /** False when both ElevenLabs and speechSynthesis are unavailable. */
  isSupported: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 15 s hard timeout — trips the circuit breaker if ElevenLabs doesn't respond. */
const TTS_HARD_TIMEOUT_MS = 15_000;

/** BCP-47 locale prefixes ordered by preference for each supported language. */
const LANG_PREFIXES: Record<AudioLanguage, string[]> = {
  en: ['en-US', 'en-GB', 'en-AU', 'en'],
  es: ['es-ES', 'es-MX', 'es-US', 'es-419', 'es'],
  pt: ['pt-BR', 'pt-PT', 'pt'],
};

/** Voice parameters per speaker role (speechSynthesis fallback). */
const VOICE_PARAMS: Record<'doctor' | 'patient', { pitch: number; rate: number; volume: number }> = {
  doctor:  { pitch: 0.85, rate: 0.92, volume: 1.0 },
  patient: { pitch: 1.15, rate: 1.00, volume: 0.9 },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function detectSpeaker(text: string): 'doctor' | 'patient' {
  return /^patient:/i.test(text.trimStart()) ? 'patient' : 'doctor';
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: AudioLanguage): SpeechSynthesisVoice | null {
  for (const prefix of LANG_PREFIXES[lang]) {
    const match = voices.find((v) => v.lang.startsWith(prefix));
    if (match) return match;
  }
  return voices[0] ?? null;
}

function toLang(lang: AudioLanguage): string {
  return lang === 'pt' ? 'pt-BR' : lang === 'es' ? 'es-419' : 'en-US';
}

// ─────────────────────────────────────────────────────────────────────────────
// ElevenLabs stream helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch audio from /api/tts/speak and pipe the stream into an <audio> element
 * via MediaSource so playback begins as soon as the first chunk arrives.
 *
 * Returns a cleanup function that aborts the in-flight request.
 */
function streamElevenLabsAudio(
  text:       string,
  voice:      'doctor' | 'patient',
  language:   AudioLanguage,
  onStart:    () => void,
  onEnd:      () => void,
  onError:    (msg: string) => void,
): () => void {
  const controller = new AbortController();
  let   timeoutId: ReturnType<typeof setTimeout> | null = null;

  // Circuit breaker: if no bytes arrive within 15 s, abort and surface error
  timeoutId = setTimeout(() => {
    controller.abort();
    onError('Audio stream did not respond within 15 s — falling back to browser voice.');
    onEnd();
  }, TTS_HARD_TIMEOUT_MS);

  (async () => {
    try {
      const res = await fetch('/api/tts/speak', {
        method:  'POST',
        signal:  controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, voice, language }),
      });

      // Disarm timeout — bytes are arriving
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }

      if (!res.ok) {
        onError('TTS request failed — falling back to browser voice.');
        onEnd();
        return;
      }

      const contentType = res.headers.get('Content-Type') ?? '';
      const supportsMediaSource =
        typeof window !== 'undefined' &&
        'MediaSource' in window &&
        MediaSource.isTypeSupported('audio/mpeg');

      if (!supportsMediaSource || !contentType.includes('audio/mpeg') || !res.body) {
        // Fallback: load the whole blob into an Audio element
        const blob      = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const audio     = new window.Audio(objectUrl);
        onStart();
        audio.play().catch(() => onError('Browser blocked audio autoplay.'));
        audio.onended = () => { URL.revokeObjectURL(objectUrl); onEnd(); };
        return;
      }

      // ── Streaming via MediaSource (non-blocking, main-thread safe) ──────────
      const mediaSource = new MediaSource();
      const objectUrl   = URL.createObjectURL(mediaSource);
      const audio       = new window.Audio(objectUrl);

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        const reader       = res.body!.getReader();

        onStart();

        async function pump() {
          try {
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                if (!sourceBuffer.updating) mediaSource.endOfStream();
                break;
              }
              // Wait for SourceBuffer to be ready before appending
              await new Promise<void>((resolve) => {
                if (!sourceBuffer.updating) { resolve(); return; }
                sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
              });
              sourceBuffer.appendBuffer(value);
            }
          } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
              onError('Audio stream interrupted.');
            }
            onEnd();
          }
        }

        pump();
      }, { once: true });

      audio.oncanplay = () => audio.play().catch(() => onError('Browser blocked audio autoplay.'));
      audio.onended  = () => { URL.revokeObjectURL(objectUrl); onEnd(); };
      audio.onerror  = () => { URL.revokeObjectURL(objectUrl); onError('Audio playback error.'); onEnd(); };

    } catch (err) {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (err instanceof Error && err.name !== 'AbortError') {
        onError('TTS network error — falling back to browser voice.');
      }
      onEnd();
    }
  })();

  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    controller.abort();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTranscriptAudio({
  segments,
  language = 'en',
  active,
  onError,
}: UseTranscriptAudioOptions): UseTranscriptAudioReturn {
  const isSpeechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  // isSupported must be state (not an inline expression) so that server and
  // client render the same initial value (false), preventing a hydration
  // mismatch on the <AudioToggleButton> conditional render.
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => { setIsSupported(true); }, []);

  const [isMuted,    setIsMuted]    = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);

  const voicesRef        = useRef<SpeechSynthesisVoice[]>([]);
  const lastQueuedRef    = useRef(-1);
  const cancelStreamRef  = useRef<(() => void) | null>(null);

  // ── Load speechSynthesis voices (async in some browsers) ─────────────────
  useEffect(() => {
    if (!isSpeechSupported) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [isSpeechSupported]);

  // ── Cancel all playback when muted, deactivated, or reset ────────────────
  useEffect(() => {
    if (isMuted || !active || segments.length === 0) {
      cancelStreamRef.current?.();
      cancelStreamRef.current = null;
      setIsLoading(false);
      if (isSpeechSupported) window.speechSynthesis.cancel();
    }
    if (segments.length === 0) {
      lastQueuedRef.current = -1;
    }
  }, [isMuted, active, segments.length, isSpeechSupported]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelStreamRef.current?.();
      if (isSpeechSupported) window.speechSynthesis.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Speak each new segment as it arrives ─────────────────────────────────
  useEffect(() => {
    if (!active || isMuted) return;

    const newEnd = segments.length - 1;
    if (newEnd <= lastQueuedRef.current) return;

    for (let i = lastQueuedRef.current + 1; i <= newEnd; i++) {
      const seg = segments[i];
      if (!seg) continue;

      // PHI tokens are never vocalised — display-only redacted labels
      if (seg.kind === 'phi') { lastQueuedRef.current = i; continue; }

      const text = seg.text.trim();
      if (!text || text === '\n') { lastQueuedRef.current = i; continue; }

      const speaker = detectSpeaker(text);
      lastQueuedRef.current = i;

      // ── Tier 1: ElevenLabs stream ─────────────────────────────────────────
      // Only attempt if we're not already streaming (one-at-a-time)
      if (!isLoading && cancelStreamRef.current === null) {
        setIsLoading(true);

        const cancel = streamElevenLabsAudio(
          text,
          speaker,
          language,
          () => setIsLoading(false),  // onStart — bytes arriving, spinner off
          () => {                     // onEnd
            setIsLoading(false);
            cancelStreamRef.current = null;
          },
          (msg) => {                  // onError — circuit breaker trip
            setIsLoading(false);
            cancelStreamRef.current = null;
            onError?.(msg);
            // ── Tier 2: browser speechSynthesis fallback ──────────────────
            if (!isSpeechSupported) return;
            const params    = VOICE_PARAMS[speaker];
            const baseVoice = pickVoice(voicesRef.current, language);
            const utter     = new SpeechSynthesisUtterance(text);
            utter.lang      = toLang(language);
            utter.pitch     = params.pitch;
            utter.rate      = params.rate;
            utter.volume    = params.volume;
            if (baseVoice) utter.voice = baseVoice;
            window.speechSynthesis.speak(utter);
          },
        );

        cancelStreamRef.current = cancel;
        continue;
      }

      // ── Tier 2: speechSynthesis (used when ElevenLabs is busy or unavailable)
      if (!isSpeechSupported) continue;
      const params    = VOICE_PARAMS[speaker];
      const baseVoice = pickVoice(voicesRef.current, language);
      const utter     = new SpeechSynthesisUtterance(text);
      utter.lang      = toLang(language);
      utter.pitch     = params.pitch;
      utter.rate      = params.rate;
      utter.volume    = params.volume;
      if (baseVoice) utter.voice = baseVoice;
      window.speechSynthesis.speak(utter);
    }
  }, [segments, isMuted, active, language, isLoading, onError, isSpeechSupported]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        cancelStreamRef.current?.();
        cancelStreamRef.current = null;
        setIsLoading(false);
        if (isSpeechSupported) window.speechSynthesis.cancel();
      }
      return next;
    });
  }, [isSpeechSupported]);

  return { isLoading, isMuted, toggleMute, isSupported };
}
