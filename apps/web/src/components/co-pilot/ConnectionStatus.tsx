'use client';

/**
 * Connection Status Indicator
 * Displays real-time connection quality with elegant animations
 */

import { motion, AnimatePresence } from 'framer-motion';
import { WifiIcon, SignalIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  quality?: 'excellent' | 'good' | 'fair' | 'poor';
  connectedDevices?: number;
  compact?: boolean;
}

export default function ConnectionStatus({
  isConnected,
  quality = 'excellent',
  connectedDevices = 0,
  compact = false,
}: ConnectionStatusProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setPulse(true);
        setTimeout(() => setPulse(false), 500);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const qualityConfig = {
    excellent: {
      color: 'text-green-500',
      bg: 'bg-green-500',
      bars: 4,
      label: 'Excellent',
    },
    good: {
      color: 'text-blue-500',
      bg: 'bg-blue-500',
      bars: 3,
      label: 'Good',
    },
    fair: {
      color: 'text-amber-500',
      bg: 'bg-amber-500',
      bars: 2,
      label: 'Fair',
    },
    poor: {
      color: 'text-red-500',
      bg: 'bg-red-500',
      bars: 1,
      label: 'Poor',
    },
  };

  const config = qualityConfig[quality];

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.2 }}
        className="relative inline-flex items-center cursor-pointer"
      >
        <motion.div
          animate={
            isConnected
              ? {
                  scale: pulse ? [1, 1.2, 1] : [1, 1.05, 1],
                  opacity: [1, 0.8, 1],
                }
              : { scale: 1 }
          }
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-2.5 h-2.5 rounded-full ${config.bg}`}
        />
        {pulse && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 rounded-full ${config.bg}`}
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05, y: -2 }}
      transition={{ type: 'spring', damping: 20 }}
      className="inline-flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full cursor-pointer"
    >
      {/* Status Indicator */}
      <div className="relative flex items-center">
        <motion.div
          animate={
            isConnected
              ? {
                  scale: pulse ? [1, 1.2, 1] : [1, 1.05, 1],
                  opacity: [1, 0.8, 1],
                }
              : { scale: 1 }
          }
          transition={{ duration: 2, repeat: Infinity }}
          className={`w-2.5 h-2.5 rounded-full ${config.bg}`}
        />
        {pulse && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 rounded-full ${config.bg}`}
          />
        )}
      </div>

      {/* Signal Bars */}
      {isConnected && (
        <div className="flex items-end gap-0.5 h-4">
          {[1, 2, 3, 4].map((bar) => (
            <motion.div
              key={bar}
              initial={{ scaleY: 0 }}
              animate={
                bar <= config.bars
                  ? {
                      scaleY: [1, 0.9, 1],
                      opacity: [1, 0.7, 1],
                    }
                  : { scaleY: 0.3, opacity: 0.3 }
              }
              transition={{
                delay: bar * 0.05,
                duration: 1.5,
                repeat: Infinity,
                repeatDelay: bar * 0.2,
              }}
              className={`w-1 rounded-sm origin-bottom ${
                bar <= config.bars ? config.bg : 'bg-gray-400/30'
              }`}
              style={{ height: `${bar * 25}%` }}
            />
          ))}
        </div>
      )}

      {/* Status Text */}
      <div className="flex flex-col">
        <motion.span
          key={isConnected ? quality : 'offline'}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-xs font-semibold ${config.color}`}
        >
          {isConnected ? config.label : 'Offline'}
        </motion.span>
        <AnimatePresence mode="wait">
          {connectedDevices > 0 && (
            <motion.span
              key={connectedDevices}
              initial={{ opacity: 0, scale: 0.8, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 5 }}
              transition={{ duration: 0.3 }}
              className="text-[10px] text-gray-300"
            >
              {connectedDevices} device{connectedDevices !== 1 ? 's' : ''}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
