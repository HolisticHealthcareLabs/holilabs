import * as Sentry from '@sentry/nextjs';

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions in dev, adjust for production

      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      // Environment
      environment: process.env.NODE_ENV || 'development',

      // Release tracking
      release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',

      // Error filtering
      beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('Sentry Error (not sent in dev):', hint.originalException || hint.syntheticException);
          return null;
        }

        // Filter out certain errors
        if (event.exception) {
          const error = hint.originalException;

          // Ignore network errors (user went offline)
          if (error && typeof error === 'object' && 'message' in error) {
            const message = (error as Error).message;
            if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
              return null;
            }
          }
        }

        return event;
      },

      // Set context tags
      initialScope: {
        tags: {
          app: 'holi-labs',
          platform: 'web',
        },
      },
    });
  }
}

// Helper to capture exceptions manually
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

// Helper to capture messages
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

// Helper to set user context
export function setUserContext(user: { id: string; email?: string; role?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

// Helper to clear user context on logout
export function clearUserContext() {
  Sentry.setUser(null);
}

// Add breadcrumb for tracking user actions
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}
