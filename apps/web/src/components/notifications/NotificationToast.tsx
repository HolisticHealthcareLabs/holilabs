'use client';

/**
 * Toast Notification Component
 * Real-time popup notifications with auto-dismiss
 * FREE - No external toast library needed
 *
 * Features:
 * - Auto-dismiss after 5 seconds
 * - Different types: success, info, warning, error
 * - Slide-in animation
 * - Click to navigate
 * - Stacked notifications
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
  duration?: number;
}

interface NotificationToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export default function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  // Auto-dismiss toasts
  useEffect(() => {
    toasts.forEach((toast) => {
      const duration = toast.duration || 5000;
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, duration);

      return () => clearTimeout(timer);
    });
  }, [toasts, onDismiss]);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getColors = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`${getColors(toast.type)} border-2 rounded-xl shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow`}
            onClick={() => {
              if (toast.action?.href) {
                window.location.href = toast.action.href;
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 text-sm mb-1">{toast.title}</h4>
                <p className="text-sm text-gray-700">{toast.message}</p>
                {toast.action && (
                  <button className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                    {toast.action.label} →
                  </button>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(toast.id);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
