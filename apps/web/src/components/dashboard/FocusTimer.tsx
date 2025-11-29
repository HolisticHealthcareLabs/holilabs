'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayIcon, PauseIcon, StopIcon } from '@heroicons/react/24/outline';
import useSound from 'use-sound';

interface FocusTimerProps {
  onComplete?: () => void;
}

export function FocusTimer({ onComplete }: FocusTimerProps) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Use use-sound hook for high-fidelity singing bowl sound
  // Fallback to a generated tone if the file doesn't exist
  const [playCompletionSound] = useSound('/sounds/singing-bowl.mp3', {
    volume: 0.5,
    onError: () => {
      // Fallback: Use Web Audio API to generate a simple tone
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 2);
      } catch (err) {
        console.warn('Could not play completion sound:', err);
      }
    },
  });

  useEffect(() => {
    if (isRunning && (minutes > 0 || seconds > 0)) {
      const timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev === 0) {
            if (minutes === 0) {
              setIsRunning(false);
              setIsComplete(true);
              playCompletionSound();
              onComplete?.();
              return 0;
            }
            setMinutes((m) => m - 1);
            return 59;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isRunning, minutes, seconds, onComplete, playCompletionSound]);

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsRunning(false);
    setIsComplete(false);
    setMinutes(25);
    setSeconds(0);
  };

  return (
    <div className="rounded-2xl p-6 backdrop-blur-xl bg-[oklch(0.95_0.02_160)]/10 dark:bg-[oklch(0.15_0.02_160)]/10 border border-[oklch(0.85_0.05_160)]/20 dark:border-[oklch(0.35_0.05_160)]/20">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
        Flow State Timer
      </h3>

      <div className="flex flex-col items-center">
        {/* Timer Display */}
        <motion.div
          className="text-5xl font-mono font-bold text-slate-900 dark:text-slate-100 mb-6"
          animate={isRunning ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {formatTime(minutes, seconds)}
        </motion.div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {!isRunning && !isComplete && (
            <button
              onClick={() => setIsRunning(true)}
              className="p-3 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          )}

          {isRunning && (
            <button
              onClick={() => setIsRunning(false)}
              className="p-3 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
            >
              <PauseIcon className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={reset}
            className="p-3 rounded-full bg-gray-500 text-white hover:bg-gray-600 transition-colors"
          >
            <StopIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Time Input */}
        {!isRunning && !isComplete && (
          <div className="mt-4 flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="120"
              value={minutes}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setMinutes(Math.min(120, Math.max(0, val)));
              }}
              className="w-16 px-2 py-1 text-center rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-slate-100"
            />
            <span className="text-slate-600 dark:text-slate-400">minutes</span>
          </div>
        )}

        {/* Completion Message */}
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="mt-4 p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium"
            >
              🎉 Focus session complete!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

