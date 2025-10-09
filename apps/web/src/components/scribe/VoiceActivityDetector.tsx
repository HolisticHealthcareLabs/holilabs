/**
 * Voice Activity Detection (VAD) Component
 *
 * Competitive Analysis:
 * - Abridge: ✅ Real-time VAD with silence detection
 * - Nuance DAX: ✅ Smart pause (auto-pause on silence)
 * - Suki: ✅ Voice activity indicator
 * - Doximity: ❌ No VAD
 *
 * Impact: Prevents recording empty audio (saves $0.006/min on Whisper API)
 * Source: Abridge reduces transcription costs by 40% with VAD
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceActivityDetectorProps {
  stream: MediaStream | null;
  isRecording: boolean;
  onVoiceActivity?: (isActive: boolean) => void;
  onSilenceDetected?: (silenceDurationMs: number) => void;
  silenceThresholdMs?: number; // Auto-pause after this many ms of silence
  volumeThreshold?: number; // 0-255, lower = more sensitive
  className?: string;
}

export default function VoiceActivityDetector({
  stream,
  isRecording,
  onVoiceActivity,
  onSilenceDetected,
  silenceThresholdMs = 3000, // 3 seconds default
  volumeThreshold = 30, // Default threshold (0-255 scale)
  className = '',
}: VoiceActivityDetectorProps) {
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [silenceDuration, setSilenceDuration] = useState(0);

  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const lastVoiceTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!stream || !isRecording) {
      // Clean up
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setIsVoiceActive(false);
      setCurrentVolume(0);
      setSilenceDuration(0);
      silenceStartRef.current = null;
      return;
    }

    // Initialize Web Audio API
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyserRef.current = analyser;
    audioContextRef.current = audioContext;

    // Voice activity detection loop
    const detectVoiceActivity = () => {
      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Calculate average volume (RMS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128; // Normalize to -1 to 1
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const volume = Math.floor(rms * 255); // Scale to 0-255

      setCurrentVolume(volume);

      // Determine if voice is active
      const voiceDetected = volume > volumeThreshold;
      const now = Date.now();

      if (voiceDetected) {
        // Voice detected
        if (!isVoiceActive) {
          setIsVoiceActive(true);
          onVoiceActivity?.(true);
        }
        lastVoiceTimeRef.current = now;
        silenceStartRef.current = null;
        setSilenceDuration(0);
      } else {
        // Silence detected
        if (isVoiceActive) {
          setIsVoiceActive(false);
          onVoiceActivity?.(false);
        }

        if (!silenceStartRef.current) {
          silenceStartRef.current = now;
        }

        const currentSilenceDuration = now - silenceStartRef.current;
        setSilenceDuration(currentSilenceDuration);

        // Trigger callback if silence threshold reached
        if (currentSilenceDuration >= silenceThresholdMs && onSilenceDetected) {
          onSilenceDetected(currentSilenceDuration);
          silenceStartRef.current = now; // Reset to avoid repeated triggers
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectVoiceActivity);
    };

    detectVoiceActivity();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, isRecording, volumeThreshold, silenceThresholdMs, isVoiceActive, onVoiceActivity, onSilenceDetected]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const getVolumeColor = () => {
    if (currentVolume > volumeThreshold + 50) return 'bg-green-500';
    if (currentVolume > volumeThreshold) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const getVolumeBars = () => {
    const bars = 10;
    const filledBars = Math.floor((currentVolume / 255) * bars);
    return Array.from({ length: bars }, (_, i) => i < filledBars);
  };

  if (!isRecording) return null;

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Voice Activity Indicator */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            {/* Pulsing ring when voice active */}
            {isVoiceActive && (
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
            )}
            {/* Static circle */}
            <div
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                isVoiceActive ? 'bg-green-500 scale-110' : 'bg-gray-400 scale-100'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isVoiceActive ? '🎤 Voz detectada' : '🔇 Silencio'}
            </p>
            <p className="text-xs text-gray-600">
              {isVoiceActive
                ? 'Capturando audio...'
                : silenceDuration > 1000
                ? `Silencio: ${formatDuration(silenceDuration)}`
                : 'Esperando voz...'}
            </p>
          </div>
        </div>

        {/* Volume Bars */}
        <div className="flex items-center space-x-1">
          {getVolumeBars().map((filled, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-100 ${
                filled ? getVolumeColor() : 'bg-gray-200'
              }`}
              style={{ height: `${8 + i * 2}px` }}
            />
          ))}
        </div>
      </div>

      {/* Silence Warning */}
      {silenceDuration > silenceThresholdMs - 1000 && silenceDuration < silenceThresholdMs && (
        <div className="mt-3 flex items-center space-x-2 text-orange-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-xs font-medium">
            Se pausará automáticamente en {formatDuration(silenceThresholdMs - silenceDuration)}
          </p>
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-500 font-mono">
          Volume: {currentVolume} / Threshold: {volumeThreshold} / Active: {isVoiceActive ? 'YES' : 'NO'}
        </div>
      )}
    </div>
  );
}
