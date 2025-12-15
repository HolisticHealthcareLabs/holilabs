'use client';

/**
 * Voice Command Feedback Component
 *
 * Visual feedback for voice command recognition
 *
 * Features:
 * - Animated waveform during listening
 * - Command recognition status
 * - Transcript preview
 * - Command suggestions
 * - Success/error animations
 */

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import { ParsedCommand } from '@/hooks/useVoiceCommands';

interface VoiceCommandFeedbackProps {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  lastCommand: ParsedCommand | null;
  error: string | null;
  availableCommands?: Array<{
    id: string;
    description: string;
    examples: string[];
    category: string;
  }>;
  showSuggestions?: boolean;
}

export function VoiceCommandFeedback({
  isListening,
  isProcessing,
  transcript,
  lastCommand,
  error,
  availableCommands = [],
  showSuggestions = true,
}: VoiceCommandFeedbackProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Show success animation when command is executed
  useEffect(() => {
    if (lastCommand && !isProcessing && !error) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastCommand, isProcessing, error]);

  // Don't render if not active
  if (!isListening && !isProcessing && !showSuccess && !error) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {/* Main Status Card */}
      <div
        className={`
          rounded-xl shadow-2xl backdrop-blur-lg border-2 p-4
          transition-all duration-300 transform
          ${
            isListening
              ? 'bg-gradient-to-br from-blue-500/90 to-purple-600/90 border-blue-400 scale-100'
              : isProcessing
              ? 'bg-gradient-to-br from-yellow-500/90 to-orange-600/90 border-yellow-400 scale-100'
              : showSuccess
              ? 'bg-gradient-to-br from-green-500/90 to-teal-600/90 border-green-400 scale-100'
              : error
              ? 'bg-gradient-to-br from-red-500/90 to-pink-600/90 border-red-400 scale-100'
              : 'bg-white/90 border-gray-300 scale-95'
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {isListening ? (
              <MicrophoneIcon className="w-6 h-6 text-white animate-pulse" />
            ) : isProcessing ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : showSuccess ? (
              <CheckCircleIcon className="w-6 h-6 text-white" />
            ) : error ? (
              <XCircleIcon className="w-6 h-6 text-white" />
            ) : null}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Status Text */}
            <div className="font-bold text-white mb-1">
              {isListening
                ? 'Listening...'
                : isProcessing
                ? 'Processing command...'
                : showSuccess
                ? 'Command executed!'
                : error
                ? 'Error'
                : 'Ready'}
            </div>

            {/* Transcript */}
            {transcript && (isListening || isProcessing) && (
              <div className="text-sm text-white/90 mb-2 italic">
                &quot;{transcript}&quot;
              </div>
            )}

            {/* Command Details */}
            {showSuccess && lastCommand && (
              <div className="text-sm text-white/90">
                <div className="font-semibold mb-1">Command: {lastCommand.commandId}</div>
                {Object.keys(lastCommand.params).length > 0 && (
                  <div className="text-xs">
                    {Object.entries(lastCommand.params).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-sm text-white/90">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Waveform Animation */}
        {isListening && (
          <div className="flex items-center justify-center gap-1 mt-3 h-12">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white rounded-full animate-waveform"
                style={{
                  animationDelay: `${i * 0.05}s`,
                  height: '100%',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Command Suggestions */}
      {showSuggestions && availableCommands.length > 0 && !isListening && !isProcessing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-h-80 overflow-y-auto">
          <div className="text-sm font-bold text-gray-900 dark:text-white mb-3">
            Available Commands
          </div>
          <div className="space-y-2">
            {availableCommands.slice(0, 5).map((cmd) => (
              <div
                key={cmd.id}
                className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  {cmd.description}
                </div>
                {/* Command example - low contrast intentional */}
                <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                  &quot;{cmd.examples[0]}&quot;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Waveform Animation Styles (add to global CSS or Tailwind config)
 */
export const waveformStyles = `
@keyframes waveform {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.animate-waveform {
  animation: waveform 0.8s ease-in-out infinite;
}
`;
