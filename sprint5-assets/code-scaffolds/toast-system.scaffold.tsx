'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Global toast/snackbar system for transient feedback
 * - Position: bottom-right desktop, bottom-center mobile
 * - Types: success, error, warning, info (colors via design tokens)
 * - Auto-dismiss: 5s success/info, sticky error/warning
 * - Stack: up to 3 toasts, oldest at bottom
 * - Accessibility: role="status", aria-live="polite" (assertive for error)
 * - Reduced motion: no slide animation
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, 0 = sticky
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastMessage[];
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Toast Provider — wrap root layout with this
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idCounterRef = useRef(0);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = `toast-${++idCounterRef.current}`;

      // Default durations per type
      const defaultDuration = {
        success: 5000,
        info: 5000,
        warning: 0, // sticky
        error: 0, // sticky
      }[type];

      const finalDuration = duration ?? defaultDuration;

      const newToast: ToastMessage = {
        id,
        type,
        message,
        duration: finalDuration,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep max 3 toasts
        if (updated.length > 3) {
          updated.shift();
        }
        return updated;
      });

      // Auto-dismiss if duration > 0
      if (finalDuration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, finalDuration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const contextValue: ToastContextType = {
    toasts,
    toast: {
      success: (message, duration) => addToast('success', message, duration),
      error: (message) => addToast('error', message),
      warning: (message) => addToast('warning', message),
      info: (message, duration) => addToast('info', message, duration),
    },
    removeToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook: useToast — use in any component
 */
export const useToast = (): ToastContextType['toast'] => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context.toast;
};

/**
 * Toast Container — renders stack at bottom-right
 */
interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  const prefersReducedMotion = useReducedMotion();

  // Desktop: bottom-right, Mobile: bottom-center
  return (
    <div
      className="fixed bottom-spacing-lg right-spacing-lg md:bottom-spacing-lg md:right-spacing-lg left-spacing-lg md:left-auto z-50 flex flex-col gap-spacing-sm max-w-sm pointer-events-none"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={removeToast}
          reducedMotion={prefersReducedMotion}
        />
      ))}
    </div>
  );
};

/**
 * Individual Toast Item
 */
interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  reducedMotion: boolean;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, reducedMotion }) => {
  const { t } = useTranslation(['common']);

  // Type to config mapping
  const typeConfig = {
    success: {
      icon: '✓',
      bgColor: 'bg-severity-minimal',
      textColor: 'text-white',
      ariaLive: 'polite' as const,
    },
    error: {
      icon: '✕',
      bgColor: 'bg-severity-severe',
      textColor: 'text-white',
      ariaLive: 'assertive' as const,
    },
    warning: {
      icon: '⚠',
      bgColor: 'bg-severity-moderate',
      textColor: 'text-white',
      ariaLive: 'assertive' as const,
    },
    info: {
      icon: 'ℹ',
      bgColor: 'bg-severity-mild',
      textColor: 'text-white',
      ariaLive: 'polite' as const,
    },
  };

  const config = typeConfig[toast.type];
  const animationClass = reducedMotion ? '' : 'animate-slide-in-right';

  return (
    <div
      role="status"
      aria-live={config.ariaLive}
      aria-atomic="true"
      className={`${config.bgColor} ${config.textColor} rounded-md shadow-lg p-spacing-md pointer-events-auto ${animationClass} transition-opacity duration-300 max-w-full`}
      style={{
        animation: reducedMotion ? 'none' : 'slideInRight 0.3s ease-out',
      }}
    >
      <div className="flex items-start gap-spacing-sm">
        {/* Icon */}
        <span className="text-heading-md flex-shrink-0 pt-spacing-xs" aria-hidden="true">
          {config.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className="text-body font-semibold mb-spacing-xs">{toast.title}</p>
          )}
          <p className="text-body break-words">{toast.message}</p>

          {/* Action button */}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="text-caption font-semibold underline hover:opacity-80 mt-spacing-xs block"
              aria-label={toast.action.label}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onRemove(toast.id)}
          className={`flex-shrink-0 text-heading-md opacity-70 hover:opacity-100 transition-opacity pt-spacing-xs`}
          aria-label={t('toast.dismiss', { defaultValue: 'Dismiss' })}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

/**
 * CSS animation (add to global styles or Tailwind config)
 * @keyframes slideInRight {
 *   from {
 *     transform: translateX(100%);
 *     opacity: 0;
 *   }
 *   to {
 *     transform: translateX(0);
 *     opacity: 1;
 *   }
 * }
 */

export default ToastProvider;
