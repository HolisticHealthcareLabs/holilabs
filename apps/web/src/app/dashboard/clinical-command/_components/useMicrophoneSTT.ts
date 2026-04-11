'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

export type STTLanguage = 'en' | 'es' | 'pt';

interface UseMicrophoneSTTOptions {
  onTranscript: (text: string, isFinal: boolean, speaker?: number) => void;
  language?: STTLanguage;
  enabled?: boolean;
  patientId?: string | null;
}

export interface UseMicrophoneSTTReturn {
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
  isSupported: boolean;
  volume: number;
}

const SPEECH_LANG_MAP: Record<STTLanguage, string> = {
  en: 'en-US',
  pt: 'pt-BR',
  es: 'es-MX',
};

const DEEPGRAM_LANG_MAP: Record<STTLanguage, string> = {
  en: 'en',
  pt: 'pt-BR',
  es: 'es',
};

function getWebSpeechAPI(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useMicrophoneSTT({
  onTranscript,
  language = 'en',
  enabled = true,
  patientId = null,
}: UseMicrophoneSTTOptions): UseMicrophoneSTTReturn {
  const hasMicrophone =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'mediaDevices' in navigator &&
    'getUserMedia' in navigator.mediaDevices;

  const hasWebSpeech = typeof window !== 'undefined' && !!getWebSpeechAPI();
  const isSupported = hasMicrophone || hasWebSpeech;

  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const engineRef = useRef<'deepgram' | 'webspeech' | null>(null);

  // Pre-cached token and mic stream for instant start
  const cachedTokenRef = useRef<string | null>(null);
  const cachedStreamRef = useRef<MediaStream | null>(null);
  const tokenFetchedRef = useRef(false);

  // Pre-fetch Deepgram token on mount so it's ready when user clicks record
  useEffect(() => {
    if (!enabled || tokenFetchedRef.current) return;
    tokenFetchedRef.current = true;

    fetch('/api/audio/token')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.token) cachedTokenRef.current = data.token;
      })
      .catch(() => {});
  }, [enabled]);

  // Pre-warm microphone permission when enabled (consent granted)
  // This triggers the browser permission dialog early so the user
  // doesn't wait for it when clicking record.
  useEffect(() => {
    if (!enabled || !hasMicrophone || cachedStreamRef.current) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        cachedStreamRef.current = stream;
      })
      .catch(() => {});
  }, [enabled, hasMicrophone]);

  useEffect(() => {
    return () => {
      stopListening();
      // Release pre-warmed stream on unmount
      if (cachedStreamRef.current) {
        cachedStreamRef.current.getTracks().forEach((t) => t.stop());
        cachedStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current || !isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    setVolume(Math.min(1, average / 128));

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, [isListening]);

  // Set up audio analyser from an existing stream (reusable)
  const setupAnalyser = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
  }, []);

  // Get mic stream: reuse pre-warmed or request fresh
  const getMicStream = useCallback(async (): Promise<MediaStream> => {
    if (cachedStreamRef.current && cachedStreamRef.current.active) {
      const stream = cachedStreamRef.current;
      cachedStreamRef.current = null;
      return stream;
    }
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }, []);

  const startWebSpeech = useCallback(async () => {
    const SpeechRecognitionAPI = getWebSpeechAPI();
    if (!SpeechRecognitionAPI) {
      throw new Error('Speech recognition not supported in this browser');
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = SPEECH_LANG_MAP[language];
    recognition.maxAlternatives = 1;

    try {
      const stream = await getMicStream();
      streamRef.current = stream;
      setupAnalyser(stream);
    } catch {
      // Volume monitoring is optional
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      if (!result) return;
      const transcript = result[0]?.transcript;
      if (transcript) {
        onTranscript(transcript, result.isFinal, undefined);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      setError(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      if (recognitionRef.current && isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;
    engineRef.current = 'webspeech';
    recognition.start();
    setIsListening(true);
    updateVolume();
  }, [language, onTranscript, isListening, updateVolume, getMicStream, setupAnalyser]);

  const startDeepgram = useCallback(async (token: string) => {
    const stream = await getMicStream();
    streamRef.current = stream;
    setupAnalyser(stream);

    const dgLang = DEEPGRAM_LANG_MAP[language];
    const dgModel = dgLang === 'en' ? 'nova-3-medical' : 'nova-3';
    const params = new URLSearchParams({
      model: dgModel,
      language: dgLang,
      smart_format: 'true',
      interim_results: 'true',
      diarize: 'true',
      punctuate: 'true',
      endpointing: '300',
      utterance_end_ms: '1000',
      filler_words: 'false',
      no_delay: 'true',
      numerals: 'true',
    });
    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
    const socket = new WebSocket(wsUrl, ['token', token]);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsListening(true);
      engineRef.current = 'deepgram';
      updateVolume();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(e.data);
        }
      };

      recorder.start(250);
    };

    socket.onmessage = (message) => {
      const received = JSON.parse(message.data);

      // UtteranceEnd: 1s silence detected — insert paragraph break
      if (received.type === 'UtteranceEnd') {
        onTranscript('\n', true, undefined);
        return;
      }

      const alt = received.channel?.alternatives?.[0];
      const transcript = alt?.transcript;
      if (transcript) {
        const isFinal = received.is_final;
        const speaker = alt?.words?.[0]?.speaker;
        onTranscript(transcript, isFinal, typeof speaker === 'number' ? speaker : undefined);
      }
    };

    socket.onerror = () => {
      setError('Speech recognition connection error');
      stopListening();
    };

    socket.onclose = () => {
      stopListening();
    };
  }, [language, onTranscript, updateVolume, getMicStream, setupAnalyser]);

  // Instant start: use cached token if available, skip network wait
  const startListening = useCallback(async () => {
    if (!isSupported || !enabled || isListening) return;

    setError(null);

    // If we have a cached Deepgram token, use it immediately (no network wait)
    if (cachedTokenRef.current) {
      try {
        const token = cachedTokenRef.current;
        cachedTokenRef.current = null; // consume it
        await startDeepgram(token);
        // Pre-fetch next token in background for subsequent recordings
        fetch('/api/audio/token')
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d?.token) cachedTokenRef.current = d.token; })
          .catch(() => {});
        return;
      } catch {
        // Deepgram failed with cached token, fall through
      }
    }

    // No cached token: try fetching with a tight 2s timeout, race against Web Speech
    const tokenPromise = Promise.race([
      fetch('/api/audio/token')
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d?.token as string | null)
        .catch(() => null),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);

    // Start Web Speech API immediately (zero network latency)
    // If Deepgram token arrives, we'll upgrade on next recording
    const token = await tokenPromise;

    if (token) {
      try {
        await startDeepgram(token);
        return;
      } catch {
        // Fall through to Web Speech
      }
    }

    try {
      await startWebSpeech();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, enabled, isListening, language, patientId, startDeepgram, startWebSpeech]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setVolume(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch { /* already stopped */ }
    }
    recognitionRef.current = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
      }
      socketRef.current.close();
    }
    socketRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;

    engineRef.current = null;

    // Pre-warm a fresh stream for next recording
    if (hasMicrophone) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => { cachedStreamRef.current = stream; })
        .catch(() => {});
    }
  }, [hasMicrophone]);

  return {
    isListening,
    startListening,
    stopListening,
    error,
    isSupported,
    volume,
  };
}
