/**
 * useAudioRecorder (V3)
 * ---------------------
 * AudioWorklet-based recorder that emits PCM16 16kHz mono chunks off-main-thread.
 *
 * BANNED: ScriptProcessorNode
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AudioChunk = {
  pcm16: ArrayBuffer;
  sampleRate: number; // 16000
};

export type UseAudioRecorderOptions = {
  chunkMs?: 100 | 120 | 150 | 200;
  targetSampleRate?: 16000;
  onChunk: (chunk: AudioChunk) => void;
};

export function useAudioRecorder({ chunkMs = 100, targetSampleRate = 16000, onChunk }: UseAudioRecorderOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const stop = useCallback(async () => {
    setIsRunning(false);

    try {
      workletRef.current?.port?.postMessage({ type: 'stop' });
    } catch {}

    try {
      workletRef.current?.disconnect();
      sourceRef.current?.disconnect();
      gainRef.current?.disconnect();
    } catch {}

    workletRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;

    try {
      await audioCtxRef.current?.close();
    } catch {}
    audioCtxRef.current = null;
  }, []);

  const start = useCallback(
    async (stream: MediaStream) => {
      setLastError(undefined);
      if (isRunning) return;

      try {
        const audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;

        // Load worklet module (served from /public/worklets/)
        await audioCtx.audioWorklet.addModule('/worklets/audio-processor.js');

        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const gain = audioCtx.createGain();
        gain.gain.value = 0; // prevent playback
        gainRef.current = gain;

        const node = new AudioWorkletNode(audioCtx, 'audio-processor', {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
          processorOptions: { chunkMs, targetSampleRate },
        });
        workletRef.current = node;

        node.port.onmessage = (evt) => {
          const data = evt.data;
          if (!data || data.type !== 'chunk') return;
          onChunk({ pcm16: data.pcm16, sampleRate: data.sampleRate });
        };

        // Must connect nodes to keep the graph alive.
        source.connect(node);
        node.connect(gain);
        gain.connect(audioCtx.destination);

        setIsRunning(true);
      } catch (e: any) {
        setLastError(e?.message || 'Failed to start audio worklet');
        await stop();
        throw e;
      }
    },
    [chunkMs, targetSampleRate, onChunk, stop, isRunning]
  );

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { start, stop, isRunning, lastError };
}


