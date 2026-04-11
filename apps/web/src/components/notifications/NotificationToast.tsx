'use client';

/**
 * ToastProvider + useToast — Step 4
 *
 * Context-aware toast system:
 * - Only renders toasts when useNotificationMode() === 'active'
 * - Suppressed entirely on clinical-command and encounter pages
 * - Position: bottom-right desktop, bottom-center mobile
 * - Stack max 3, newest on top
 * - Auto-dismiss: 8s default, 0 = sticky (error/warning)
 * - Reduced motion: instant show/hide
 * - aria-live="polite" (assertive for errors)
 * - Design-token-only styling.
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useNotificationMode } from '@/hooks/useNotificationMode';

/* ── Types ──────────────────────────────────────────────────────── */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastAPI {
  success: (message: string, duration?: number) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string, duration?: number) => void;
}

interface ToastContextValue {
  toast: ToastAPI;
}

/* ── Context ────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

/* ── Config ─────────────────────────────────────────────────────── */

const TYPE_STYLES: Record<ToastType, { icon: string; bg: string; fg: string; ariaLive: 'polite' | 'assertive' }> = {
  success: {
    icon: '✓',
    bg: 'color-mix(in srgb, var(--severity-minimal) 15%, var(--surface-elevated))',
    fg: 'var(--severity-minimal)',
    ariaLive: 'polite',
  },
  error: {
    icon: '✕',
    bg: 'color-mix(in srgb, var(--severity-critical) 15%, var(--surface-elevated))',
    fg: 'var(--severity-critical)',
    ariaLive: 'assertive',
  },
  warning: {
    icon: '⚠',
    bg: 'color-mix(in srgb, var(--severity-mild) 15%, var(--surface-elevated))',
    fg: 'var(--severity-mild)',
    ariaLive: 'assertive',
  },
  info: {
    icon: 'ℹ',
    bg: 'color-mix(in srgb, var(--channel-sms) 15%, var(--surface-elevated))',
    fg: 'var(--channel-sms)',
    ariaLive: 'polite',
  },
};

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 5000,
  info: 5000,
  warning: 0,
  error: 0,
};

/* ── Animations ─────────────────────────────────────────────────── */

const TOAST_VARIANTS = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as any, damping: 22, stiffness: 300 } },
  exit: { opacity: 0, x: 60, transition: { duration: 0.15 } },
};

/* ── Provider ───────────────────────────────────────────────────── */

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const mode = useNotificationMode();
  const prefersReduced = usePrefersReducedMotion();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration?: number) => {
      const id = `toast-${++idRef.current}`;
      const finalDuration = duration ?? DEFAULT_DURATIONS[type];

      setToasts((prev) => {
        const next = [...prev, { id, type, message, duration: finalDuration }];
        return next.length > 3 ? next.slice(-3) : next;
      });

      if (finalDuration > 0) {
        setTimeout(() => removeToast(id), finalDuration);
      }
    },
    [removeToast]
  );

  const toastAPI: ToastAPI = {
    success: (msg, dur) => addToast('success', msg, dur),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg, dur) => addToast('info', msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast: toastAPI }}>
      {children}

      {/* Only render toasts in active mode */}
      {(mode.mode as string) === 'active' && (
        <div
          className="fixed z-50 flex flex-col gap-2 pointer-events-none"
          style={{
            bottom: 'var(--space-lg)',
            right: 'var(--space-lg)',
            maxWidth: '380px',
            width: '100%',
          }}
          aria-label="Notifications"
        >
          <AnimatePresence>
            {toasts.map((toast) => {
              const config = TYPE_STYLES[toast.type];
              return (
                <motion.div
                  key={toast.id}
                  layout
                  variants={prefersReduced ? undefined : TOAST_VARIANTS}
                  initial={prefersReduced ? undefined : 'hidden'}
                  animate={prefersReduced ? undefined : 'visible'}
                  exit={prefersReduced ? undefined : 'exit'}
                  role="status"
                  aria-live={config.ariaLive}
                  aria-atomic="true"
                  className="pointer-events-auto flex items-start gap-3"
                  style={{
                    padding: 'var(--space-md)',
                    borderRadius: 'var(--radius-lg)',
                    background: config.bg,
                    border: `1px solid color-mix(in srgb, ${config.fg} 25%, transparent)`,
                    boxShadow: 'var(--token-shadow-md)',
                  }}
                >
                  {/* Icon */}
                  <span
                    className="shrink-0 flex items-center justify-center rounded-full font-bold"
                    style={{
                      width: '24px',
                      height: '24px',
                      fontSize: '13px',
                      background: `color-mix(in srgb, ${config.fg} 20%, transparent)`,
                      color: config.fg,
                    }}
                    aria-hidden="true"
                  >
                    {config.icon}
                  </span>

                  {/* Content */}
                  <p
                    className="flex-1 min-w-0"
                    style={{
                      fontSize: 'var(--text-body)',
                      color: 'var(--text-primary)',
                      lineHeight: 'var(--leading-normal)',
                    }}
                  >
                    {toast.message}
                  </p>

                  {/* Dismiss */}
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="shrink-0 flex items-center justify-center"
                    style={{
                      width: 'var(--touch-sm)',
                      height: 'var(--touch-sm)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-tertiary)',
                    }}
                    aria-label="Dismiss"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
