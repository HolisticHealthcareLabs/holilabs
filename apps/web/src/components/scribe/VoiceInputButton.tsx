'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  language?: 'pt-BR' | 'en-US' | 'es-ES';
  className?: string;
}

export default function VoiceInputButton({
  onTranscript,
  language = 'pt-BR',
  className = '',
}: VoiceInputButtonProps) {
  const { t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError(t('soapTemplates.voiceInput.unsupportedBrowser'));
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed') {
        setError(t('soapTemplates.voiceInput.microphonePermission'));
      } else if (event.error === 'no-speech') {
        // Don't show error for no-speech, just stop listening
        setIsListening(false);
      } else {
        setError(`Error: ${event.error}`);
      }

      setIsListening(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsListening(false);

      // If we have a transcript when recognition ends, process it
      if (transcript.trim()) {
        setIsProcessing(true);
        setTimeout(() => {
          onTranscript(transcript.trim());
          setTranscript('');
          setIsProcessing(false);
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, transcript, onTranscript, t]);

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      setError('Failed to start voice recognition');
    }
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  };

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          disabled
          className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed flex items-center space-x-2"
          title={t('soapTemplates.voiceInput.unsupportedBrowser')}
        >
          <span>🎤</span>
          <span className="text-sm">{t('soapTemplates.voiceInput.title')}</span>
        </button>
        <span className="text-xs text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <button
          onClick={handleClick}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-lg font-semibold transition-all shadow-md flex items-center space-x-2 ${
            isListening
              ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          title={
            isListening
              ? t('soapTemplates.voiceInput.stopRecording')
              : t('soapTemplates.voiceInput.startRecording')
          }
        >
          <span className="text-xl">
            {isProcessing ? '⏳' : isListening ? '🔴' : '🎤'}
          </span>
          <span className="text-sm font-bold">
            {isProcessing
              ? t('soapTemplates.voiceInput.processing')
              : isListening
              ? t('soapTemplates.voiceInput.listening')
              : t('soapTemplates.voiceInput.startRecording')}
          </span>
        </button>

        {isListening && (
          <div className="flex space-x-1">
            <div className="w-2 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-8 bg-purple-500 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-6 bg-blue-500 rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </div>

      {/* Live Transcript Preview */}
      {(isListening || isProcessing) && transcript && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-600 font-semibold mb-1">
            {t('soapTemplates.voiceInput.transcribing')}
          </div>
          <p className="text-sm text-gray-900 italic">{transcript}</p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-xs text-red-600">{error}</span>
        </div>
      )}
    </div>
  );
}
