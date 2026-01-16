'use client';

/**
 * Toast Notification Component
 * Elegant toast notifications for success, error, warning, and info messages
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

export default function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const config = {
    success: {
      icon: CheckCircleIcon,
      bg: 'bg-green-500/10 dark:bg-green-500/20',
      border: 'border-green-500/50',
      iconColor: 'text-green-500',
      titleColor: 'text-green-700 dark:text-green-300',
    },
    error: {
      icon: XCircleIcon,
      bg: 'bg-red-500/10 dark:bg-red-500/20',
      border: 'border-red-500/50',
      iconColor: 'text-red-500',
      titleColor: 'text-red-700 dark:text-red-300',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/50',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-700 dark:text-amber-300',
    },
    info: {
      icon: InformationCircleIcon,
      bg: 'bg-blue-500/10 dark:bg-blue-500/20',
      border: 'border-blue-500/50',
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-700 dark:text-blue-300',
    },
  };

  const { icon: Icon, bg, border, iconColor, titleColor } = config[type];

  // Type-specific entrance animations
  const entranceAnimation = {
    error: {
      initial: { opacity: 0, y: -20, scale: 0.95, x: -10 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        x: 0,
      },
    },
    warning: {
      initial: { opacity: 0, y: -20, scale: 0.95 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    },
    success: {
      initial: { opacity: 0, y: -20, scale: 0.8 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    },
    info: {
      initial: { opacity: 0, y: -20, scale: 0.95 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
      },
    },
  };

  const iconAnimation = {
    error: {
      animate: { rotate: 0, scale: 1 },
      transition: { delay: 0.08, type: 'spring', damping: 18, stiffness: 260 } as any,
    },
    warning: {
      animate: { y: 0, scale: 1 },
      transition: { delay: 0.08, type: 'spring', damping: 18, stiffness: 260 } as any,
    },
    success: {
      animate: { scale: 1, rotate: 0 },
      transition: { delay: 0.08, type: 'spring', damping: 14, stiffness: 260 } as any,
    },
    info: {
      animate: { scale: 1, rotate: 0 },
      transition: { delay: 0.08, type: 'spring', damping: 16, stiffness: 260 } as any,
    },
  };

  return (
    <motion.div
      initial={entranceAnimation[type].initial}
      animate={entranceAnimation[type].animate}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`w-full max-w-sm backdrop-blur-xl ${bg} border-2 ${border} rounded-xl shadow-2xl overflow-hidden`}
    >
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <motion.div
            // Avoid multi-keyframe spring animations (Motion v12 limitation).
            initial={type === 'success' || type === 'info' ? { scale: 0, rotate: -180 } : { scale: 0 }}
            animate={iconAnimation[type].animate}
            transition={iconAnimation[type].transition}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </motion.div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={`text-sm font-semibold ${titleColor}`}
          >
            {title}
          </motion.p>
          {message && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
              className="text-xs text-gray-600 dark:text-gray-400 mt-1"
            >
              {message}
            </motion.p>
          )}
        </div>

        {/* Close Button */}
        <motion.button
          onClick={() => onClose(id)}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
          className="flex-shrink-0 w-6 h-6 rounded-full bg-white/50 dark:bg-black/30 hover:bg-white/70 dark:hover:bg-black/50 flex items-center justify-center transition"
        >
          <XMarkIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </motion.button>
      </div>

      {/* Progress Bar */}
      {duration > 0 && (
        <div className="relative h-1 bg-black/5 dark:bg-white/5">
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className={`absolute inset-0 ${config[type].iconColor.replace('text-', 'bg-')} origin-left`}
          />
          {/* Pulse effect on progress bar */}
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`absolute inset-0 ${config[type].iconColor.replace('text-', 'bg-')} origin-left`}
            style={{ clipPath: 'inset(0 98% 0 0)' }}
          />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Toast Container Component
 * Manages multiple toast notifications
 */

interface ToastContainerProps {
  toasts: Omit<ToastProps, 'onClose'>[];
  onClose: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({
  toasts,
  onClose,
  position = 'top-right',
}: ToastContainerProps) {
  const positionClasses = {
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-center': 'top-6 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-3 pointer-events-none`}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
