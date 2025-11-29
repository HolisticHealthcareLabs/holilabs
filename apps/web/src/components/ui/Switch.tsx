'use client';

import { Switch as HeadlessSwitch } from '@headlessui/react';
import { motion } from 'framer-motion';

interface SwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export function Switch({
  enabled,
  onChange,
  label,
  disabled = false,
  size = 'md',
  showPulse = false,
}: SwitchProps) {
  const sizeClasses = {
    sm: {
      container: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
    },
    md: {
      container: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
    },
    lg: {
      container: 'h-7 w-13',
      thumb: 'h-6 w-6',
      translate: 'translate-x-6',
    },
  };

  const classes = sizeClasses[size];

  return (
    <HeadlessSwitch.Group>
      <div className="flex items-center gap-3">
        {label && (
          <HeadlessSwitch.Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </HeadlessSwitch.Label>
        )}
        <HeadlessSwitch
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
          className={`${enabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'} 
            ${classes.container}
            relative inline-flex items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${showPulse && enabled ? 'ring-2 ring-green-400 ring-offset-2' : ''}
          `}
        >
          {showPulse && enabled && (
            <motion.div
              className="absolute inset-0 rounded-full bg-green-400"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
          <motion.span
            className={`${enabled ? classes.translate : 'translate-x-0.5'} 
              ${classes.thumb}
              inline-block transform rounded-full bg-white transition-transform
              ${enabled && showPulse ? 'ring-2 ring-green-400' : ''}
            `}
            layout
          />
        </HeadlessSwitch>
      </div>
    </HeadlessSwitch.Group>
  );
}

