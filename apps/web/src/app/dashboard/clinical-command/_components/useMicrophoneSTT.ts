'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export type STTLanguage = 'en' | 'es' | 'pt';

interface UseMicrophoneSTTOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
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
  volume: number; // 0.0 to 1.0 for waveform
}

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
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
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
    // Normalize volume to 0.0 - 1.0 (max byte value is 255)
    setVolume(Math.min(1, average / 128));

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  }, [isListening]);

  const startListening = useCallback(async () => {
    if (!isSupported || !enabled || isListening) return;

    setError(null);

    try {
      // 1. Fetch temporary Deepgram token
      const tokenRes = await fetch('/api/audio/token');
      if (!tokenRes.ok) {
        throw new Error('Failed to authenticate with speech service');
      }
      const { token } = await tokenRes.json();

      // 2. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Setup Audio Context for Volume Analysis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // 4. Connect to Deepgram WebSocket
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2-medical&language=${language}&smart_format=true&interim_results=true`;
      const socket = new WebSocket(wsUrl, ['token', token]);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsListening(true);
        updateVolume();

        // Start MediaRecorder once socket is open
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

        // Send chunks every 250ms for low latency
        recorder.start(250);
      };

      socket.onmessage = (message) => {
        const received = JSON.parse(message.data);
        const transcript = received.channel?.alternatives[0]?.transcript;
        if (transcript) {
          const isFinal = received.is_final;
          onTranscript(transcript, isFinal);
        }
      };

      socket.onerror = (e) => {
        console.error('[useMicrophoneSTT]', { event: 'deepgram_ws_error', error: String(e) });
        setError('Speech recognition connection error');
        stopListening();
      };

      socket.onclose = () => {
        stopListening();
      };

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      setError(msg);
      console.error('[useMicrophoneSTT]', { event: 'start_listening_error', error: err instanceof Error ? err.message : String(err) });
      stopListening();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, enabled, isListening, language, patientId, updateVolume]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    setVolume(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (socketRef.current) {
      // Send empty string to tell Deepgram we're done
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
      audioContextRef.current.close().catch((err) => console.error('[useMicrophoneSTT]', { event: 'audio_context_close_error', error: String(err) }));
    }
    audioContextRef.current = null;
  }, []);

  return {
    isListening,
    startListening,
    stopListening,
    error,
    isSupported,
    volume,
  };
}
