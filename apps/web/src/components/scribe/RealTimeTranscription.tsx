'use client';

/**
 * Real-Time AI Transcription Component
 *
 * Production-grade real-time speech-to-text using Deepgram WebSocket API
 * Features:
 * - Live streaming transcription
 * - Confidence score visualization
 * - Speaker diarization
 * - Auto-reconnection on failure
 * - Low-confidence highlighting
 * - Pause/resume capability
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MicrophoneIcon,
  StopIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  UserIcon,
  PauseIcon,
  PlayIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { identifyMedicalTerms, getMedicalTermColor, getMedicalTermCategoryName } from '@/lib/medical/terminology';

interface TranscriptWord {
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
}

interface TranscriptSegment {
  text: string;
  confidence: number;
  isFinal: boolean;
  words: TranscriptWord[];
  speaker?: number;
  timestamp: number;
}

interface RealTimeTranscriptionProps {
  /** Patient ID for context */
  patientId?: string;

  /** Callback when transcription updates */
  onTranscriptUpdate?: (segments: TranscriptSegment[]) => void;

  /** Callback when recording stops */
  onRecordingStop?: (finalTranscript: string) => void;

  /** Auto-start recording on mount */
  autoStart?: boolean;

  /** Enable speaker diarization */
  enableDiarization?: boolean;

  /** Language code (default: en-US) */
  language?: string;
}

export function RealTimeTranscription({
  patientId,
  onTranscriptUpdate,
  onRecordingStop,
  autoStart = false,
  enableDiarization = true,
  language = 'en-US',
}: RealTimeTranscriptionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [highlightMedicalTerms, setHighlightMedicalTerms] = useState(true);
  const [dgLanguage, setDgLanguage] = useState(language);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // legacy (kept to minimize diff)
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const chunksQueueRef = useRef<ArrayBuffer[]>([]);
  const intentionalCloseRef = useRef(false);

  useEffect(() => {
    // If parent controls language, reflect it. Don't clobber an active recording.
    if (!isRecording) setDgLanguage(language);
  }, [language, isRecording]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('holi.dgLanguage');
      if (saved && !isRecording) setDgLanguage(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i] || 0));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  };

  /**
   * Initialize Deepgram WebSocket connection
   */
  const connectDeepgram = useCallback(async () => {
    try {
      // Hard guarantee: we do NOT allow direct browser → Deepgram streaming in this app.
      // All transcription must be server-mediated (Deepgram → Presidio → UI/DB).
      setError('Live transcription is running in server mode. Direct browser-to-Deepgram is disabled for compliance.');
      setIsConnected(false);
      return;

      setError(null);

      // Get Deepgram API key from backend
      const response = await fetch('/api/scribe/deepgram-token');
      if (!response.ok) {
        throw new Error('Failed to get Deepgram token');
      }

      const { token } = await response.json();

      // Build Deepgram WebSocket URL
      const params = new URLSearchParams({
        model: 'nova-2',
        language: dgLanguage,
        punctuate: 'true',
        interim_results: 'true',
        smart_format: 'true',
        diarize: enableDiarization ? 'true' : 'false',
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
      });

      const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl, ['token', token]);

      ws.onopen = () => {
        console.log('Deepgram connected');
        setIsConnected(true);
        setConnectionQuality('excellent');
        reconnectAttemptsRef.current = 0;

        // Send queued audio chunks
        while (chunksQueueRef.current.length > 0) {
          const chunk = chunksQueueRef.current.shift();
          if (chunk && ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle transcription results
          if (data.channel?.alternatives?.[0]) {
            const alternative = data.channel.alternatives[0];
            const isFinal = data.is_final || false;

            const segment: TranscriptSegment = {
              text: alternative.transcript,
              confidence: alternative.confidence || 0,
              isFinal,
              words: alternative.words?.map((w: any) => ({
                word: w.word,
                confidence: w.confidence || 0,
                start: w.start,
                end: w.end,
                speaker: w.speaker,
              })) || [],
              speaker: data.channel.alternatives[0].words?.[0]?.speaker,
              timestamp: Date.now(),
            };

            if (segment.text.trim()) {
              setSegments(prev => {
                // If final, replace the last interim segment (prevents "double" entries),
                // and de-dupe identical repeated finals that Deepgram may emit.
                if (isFinal) {
                  const lastIndex = prev.length - 1;

                  // Replace last interim with this final if it exists.
                  if (lastIndex >= 0 && !prev[lastIndex].isFinal) {
                    const updated = [...prev.slice(0, -1), segment];
                    onTranscriptUpdate?.(updated);
                    return updated;
                  }

                  // If the last is already the same final, don't append.
                  if (
                    lastIndex >= 0 &&
                    prev[lastIndex].isFinal &&
                    prev[lastIndex].text.trim() === segment.text.trim() &&
                    (prev[lastIndex].speaker ?? null) === (segment.speaker ?? null)
                  ) {
                    onTranscriptUpdate?.(prev);
                    return prev;
                  }

                  const updated = [...prev, segment];
                  onTranscriptUpdate?.(updated);
                  return updated;
                }

                // If interim, replace last non-final segment
                const lastIndex = prev.length - 1;
                if (lastIndex >= 0 && !prev[lastIndex].isFinal) {
                  const updated = [...prev.slice(0, -1), segment];
                  onTranscriptUpdate?.(updated);
                  return updated;
                }

                const updated = [...prev, segment];
                onTranscriptUpdate?.(updated);
                return updated;
              });
            }
          }

          // Monitor connection quality based on latency
          if (data.metadata?.request_id) {
            const latency = Date.now() - data.start;
            if (latency < 100) setConnectionQuality('excellent');
            else if (latency < 300) setConnectionQuality('good');
            else setConnectionQuality('poor');
          }
        } catch (err) {
          console.error('Error parsing Deepgram message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('Deepgram WebSocket error:', event);
        setError('Connection error occurred');
        setConnectionQuality('poor');
      };

      ws.onclose = () => {
        console.log('Deepgram disconnected');
        setIsConnected(false);

        // Auto-reconnect if still recording
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false;
          return;
        }

        if (isRecording && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current++;
          setError(`Reconnecting... (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectDeepgram();
          }, 2000 * reconnectAttemptsRef.current);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect to Deepgram:', err);
      setError('Failed to initialize transcription service');
      setIsConnected(false);
    }
  }, [dgLanguage, enableDiarization, isRecording, onTranscriptUpdate]);

  const switchLanguage = useCallback(
    async (nextLang: string) => {
      try {
        window.localStorage.setItem('holi.dgLanguage', nextLang);
      } catch {}
      setDgLanguage(nextLang);
      if (!isRecording) return;

      // Seamless-ish: keep the mic stream running, just swap the websocket.
      try {
        reconnectAttemptsRef.current = 0;
        setError('Switching language…');
        if (wsRef.current) {
          intentionalCloseRef.current = true;
          wsRef.current.close();
          wsRef.current = null;
        }
        await connectDeepgram();
        setError(null);
      } catch (e) {
        // If this fails, user can always Stop/Start recording.
        setError('Failed to switch language. Try Stop/Start recording.');
      }
    },
    [connectDeepgram, isRecording]
  );

  /**
   * Start recording and streaming to Deepgram
   */
  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create AudioContext for resampling
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create nodes for PCM streaming (Deepgram expects raw linear16, not a WebM container)
      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;

      // ScriptProcessor is deprecated but reliable for simple PCM streaming in modern browsers.
      // bufferSize 4096 @ 16kHz ≈ 256ms chunks.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      // Mute output (we only need the callback)
      const gain = audioContext.createGain();
      gain.gain.value = 0;
      gainNodeRef.current = gain;

      processor.onaudioprocess = (e) => {
        if (isPaused) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm16 = floatTo16BitPCM(input);
        const payload = pcm16.buffer;

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(payload);
        } else {
          // Queue bytes if not connected yet
          chunksQueueRef.current.push(payload);
        }
      };

      sourceNode.connect(processor);
      processor.connect(gain);
      gain.connect(audioContext.destination);

      // Connect to Deepgram
      await connectDeepgram();

      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Microphone access denied or not available');
    }
  }, [connectDeepgram, isPaused, onRecordingStop, segments]);

  /**
   * Stop recording
   */
  const stopRecording = useCallback(() => {
    // Stop audio graph
    try {
      processorNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
    } catch {}

    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    gainNodeRef.current = null;

    // Stop mic stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Send final transcript
    const finalTranscript = segments
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join(' ');
    onRecordingStop?.(finalTranscript);

    setIsRecording(false);
    setIsPaused(false);
    setIsConnected(false);
  }, [onRecordingStop, segments]);

  /**
   * Pause/resume recording
   */
  const togglePause = useCallback(() => {
    setIsPaused((p) => !p);
  }, [isPaused]);

  /**
   * Clear transcript
   */
  const clearTranscript = useCallback(() => {
    setSegments([]);
  }, []);

  /**
   * Auto-start if enabled
   */
  useEffect(() => {
    if (autoStart) {
      startRecording();
    }

    return () => {
      stopRecording();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoStart]); // Only run on mount

  /**
   * Get confidence color
   */
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  /**
   * Get connection quality indicator
   */
  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Real-Time Transcription
          </h2>

          {isConnected && (
            <div className="flex items-center gap-1 text-sm">
              <SignalIcon className={`w-4 h-4 ${getConnectionQualityColor()}`} />
              {/* Decorative - low contrast intentional for connection quality meta info */}
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {connectionQuality}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
        {/* Language Selector (speech language, not UI language) */}
        <select
          value={dgLanguage}
          onChange={(e) => switchLanguage(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          title="Speech language for Deepgram (switching will reconnect)"
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="pt">Português</option>
          <option value="multi">Auto (multi-language)</option>
        </select>

          {/* Medical Terms Toggle */}
          <button
            onClick={() => setHighlightMedicalTerms(!highlightMedicalTerms)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
              highlightMedicalTerms
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
            title="Toggle medical term highlighting"
          >
            <SparklesIcon className="w-4 h-4" />
            {highlightMedicalTerms ? 'On' : 'Off'}
          </button>

          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
            >
              <MicrophoneIcon className="w-5 h-5" />
              Start Recording
            </button>
          ) : (
            <>
              <button
                onClick={togglePause}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {isPaused ? (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    Resume
                  </>
                ) : (
                  <>
                    <PauseIcon className="w-5 h-5" />
                    Pause
                  </>
                )}
              </button>

              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <StopIcon className="w-5 h-5" />
                Stop
              </button>
            </>
          )}

          {segments.length > 0 && (
            <button
              onClick={clearTranscript}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Medical term legend */}
      {highlightMedicalTerms && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-700 dark:text-gray-200">Legend:</span>
            {(
              ['symptoms', 'diagnoses', 'medications', 'procedures', 'vitals', 'anatomy'] as const
            ).map((cat) => (
              <span
                key={cat}
                className={`inline-flex items-center px-2 py-0.5 rounded border font-semibold ${getMedicalTermColor(cat)}`}
                title={getMedicalTermCategoryName(cat)}
              >
                {getMedicalTermCategoryName(cat)}
              </span>
            ))}
            <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">
              Highlighting is a UI aid; persistence is handled separately.
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {isPaused ? 'Paused' : 'Recording...'}
            </span>
          </div>

          {!isPaused && (
            <span className="text-xs text-blue-700 dark:text-blue-300">
              Speak naturally - AI is listening
            </span>
          )}
        </div>
      )}

      {/* Transcript Display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {segments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {/* Decorative - low contrast intentional for empty state icon */}
            <MicrophoneIcon className="w-16 h-16 text-gray-300 dark:text-gray-700 mb-4" />
            {/* Decorative - low contrast intentional for empty state text */}
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              {isRecording ? 'Listening...' : 'Start recording to see live transcription'}
            </p>
            {/* Decorative - low contrast intentional for empty state helper text */}
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
              Speech will appear here in real-time
            </p>
          </div>
        ) : (
          segments.map((segment, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg transition-all ${
                segment.isFinal
                  ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {/* Speaker & Confidence */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {enableDiarization && segment.speaker !== undefined && (
                    // Decorative - low contrast intentional for speaker label
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <UserIcon className="w-4 h-4" />
                      <span>Speaker {segment.speaker + 1}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {!segment.isFinal && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      Interim
                    </span>
                  )}

                  <span className={`font-semibold ${getConfidenceColor(segment.confidence)}`}>
                    {Math.round(segment.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Transcript Text with Word-Level Confidence and Medical Terms */}
              <div className="text-gray-900 dark:text-white text-base leading-relaxed">
                {segment.words.length > 0 && highlightMedicalTerms ? (
                  <MedicalTermHighlighter words={segment.words} text={segment.text} />
                ) : segment.words.length > 0 ? (
                  segment.words.map((word, wordIdx) => (
                    <span
                      key={wordIdx}
                      className={`${
                        word.confidence < 0.7 ? 'bg-yellow-200 dark:bg-yellow-900/40' : ''
                      }`}
                      title={`Confidence: ${Math.round(word.confidence * 100)}%`}
                    >
                      {word.word}{' '}
                    </span>
                  ))
                ) : (
                  <span>{segment.text}</span>
                )}
              </div>

              {/* Timestamp */}
              {/* Decorative - low contrast intentional for timestamp */}
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {new Date(segment.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Stats */}
      {segments.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          {/* Decorative - low contrast intentional for footer stats meta info */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>
              {segments.filter(s => s.isFinal).length} final segments
            </span>
            <span>
              {segments.filter(s => s.isFinal).reduce((acc, s) => acc + s.text.split(' ').length, 0)} words
            </span>
            <span>
              Avg confidence: {Math.round(
                (segments.filter(s => s.isFinal).reduce((acc, s) => acc + s.confidence, 0) /
                segments.filter(s => s.isFinal).length) * 100
              )}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Medical Term Highlighter Component
 * Highlights medical terms within transcribed words
 */
function MedicalTermHighlighter({ words, text }: { words: TranscriptWord[]; text: string }) {
  const medicalTerms = identifyMedicalTerms(text);

  return (
    <>
      {words.map((word, wordIdx) => {
        // Find if this word is part of a medical term
        const wordStart = text.indexOf(word.word, wordIdx > 0 ? text.indexOf(words[wordIdx - 1].word) + words[wordIdx - 1].word.length : 0);
        const wordEnd = wordStart + word.word.length;

        const matchingTerm = medicalTerms.find(
          term => wordStart >= term.startIndex && wordEnd <= term.endIndex
        );

        if (matchingTerm) {
          const color = getMedicalTermColor(matchingTerm.category);
          const categoryName = getMedicalTermCategoryName(matchingTerm.category);

          return (
            <span
              key={wordIdx}
              className={`inline-flex items-center px-1 rounded border font-medium ${color} ${
                word.confidence < 0.7 ? 'opacity-75' : ''
              }`}
              title={`${categoryName} | Confidence: ${Math.round(word.confidence * 100)}%`}
            >
              {word.word}{' '}
            </span>
          );
        }

        return (
          <span
            key={wordIdx}
            className={`${
              word.confidence < 0.7 ? 'bg-yellow-200 dark:bg-yellow-900/40 px-1 rounded' : ''
            }`}
            title={`Confidence: ${Math.round(word.confidence * 100)}%`}
          >
            {word.word}{' '}
          </span>
        );
      })}
    </>
  );
}
