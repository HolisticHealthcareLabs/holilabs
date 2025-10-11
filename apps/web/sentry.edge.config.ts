/**
 * Sentry Edge Runtime Configuration
 *
 * Captures errors from Next.js Edge Runtime (middleware, edge API routes)
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production or when explicitly configured
  enabled: process.env.NODE_ENV === 'production' && !!SENTRY_DSN,

  // Performance Monitoring (lower sample rate for edge)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive headers
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['x-api-key'];
    }

    // Sanitize cookies
    if (event.request?.cookies) {
      delete event.request.cookies['patient-session'];
      delete event.request.cookies['next-auth.session-token'];
      delete event.request.cookies['__Secure-next-auth.session-token'];
    }

    // Sanitize query strings
    if (event.request?.query_string) {
      event.request.query_string = event.request.query_string
        .replace(/token=[^&]*/g, 'token=[REDACTED]')
        .replace(/key=[^&]*/g, 'key=[REDACTED]')
        .replace(/secret=[^&]*/g, 'secret=[REDACTED]');
    }

    return event;
  },

  // Ignore transient errors
  ignoreErrors: [
    'AbortError',
    'The user aborted a request',
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Minimal breadcrumbs for edge (memory constrained)
  beforeBreadcrumb(breadcrumb, hint) {
    // Only keep errors
    if (breadcrumb.level !== 'error') {
      return null;
    }
    return breadcrumb;
  },
});
