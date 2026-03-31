/**
 * Sentry SDK Configuration for Next.js (HoliLabs)
 * - Client-side: Sentry.init() with environment, release tag
 * - Server-side: Next.js instrumentation hook (instrumentation.ts)
 * - PII scrubbing: strip CPF, CNS, RG, email, phone (RUTH)
 * - CYRUS: organizationId + userId attached as tags (scoping)
 * - ELENA: clinical endpoint errors tagged with domain: "clinical" (priority alerting)
 * - Performance tracing: 10% sample in production, 100% in staging
 * - Source maps uploaded during CI build
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Client-side Sentry configuration (browser)
 * Import and call this in your root layout or _app.tsx
 */
export function initSentryBrowser() {
  Sentry.init({
    // DSN (get from Sentry project settings)
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment and release
    environment: process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_RELEASE || '0.0.0',

    // Tracing
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    tracePropagationTargets: [
      // Trace internal requests
      /^\//,
      // Trace API calls to our own domain
      /^https:\/\/api\.holilabs\.com/,
    ],

    // Integrations
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
      new Sentry.HttpClient(),
    ],

    // Session replay (10% in production)
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Capture all replay for errors

    // Error handling
    beforeSend(event, hint) {
      // RUTH: scrub PII before sending
      return scrubbingFilter(event, hint);
    },

    // Attachments (logs, context)
    attachStacktrace: true,
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB

    // Performance monitoring
    enableMetrics: true,
    maxValueLength: 1000, // limit size of context values
  });
}

/**
 * Server-side Sentry configuration
 * File: app/instrumentation.ts (Next.js instrumentation hook)
 *
 * export async function register() {
 *   if (process.env.NEXT_RUNTIME === 'nodejs') {
 *     await import('@/lib/sentry-server');
 *   }
 * }
 */
export function initSentryServer() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.RELEASE || '0.0.0',

    // Server-side tracing
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.RequestData({ include: { cookies: false } }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],

    // PII scrubbing
    beforeSend(event, hint) {
      return scrubbingFilter(event, hint);
    },
  });
}

/**
 * PII scrubbing filter (RUTH: LGPD compliance)
 * Strips: CPF, CNS, RG, email, phone numbers
 */
function scrubbingFilter(
  event: Sentry.Event,
  hint: Sentry.EventHint
): Sentry.Event | null {
  if (!event) return null;

  // Patterns for sensitive data
  const patterns = {
    cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g, // XXX.XXX.XXX-XX
    cnsBrazil: /\d{15}/g, // 15 digits
    rg: /\d{2}\.\d{3}\.\d{3}-\d{2}/g, // XX.XXX.XXX-XX
    email: /[\w\.-]+@[\w\.-]+\.\w+/g,
    phone: /\+?55?\s?\(?[0-9]{2}\)?9?[0-9]{4}-?[0-9]{4}/g,
  };

  // Helper: redact string
  const redactString = (str: string): string => {
    let redacted = str;
    Object.values(patterns).forEach((pattern) => {
      redacted = redacted.replace(pattern, '[REDACTED]');
    });
    return redacted;
  };

  // Scrub error message
  if (event.message) {
    event.message = redactString(event.message);
  }

  // Scrub exception messages
  if (event.exception?.values) {
    event.exception.values.forEach((exc) => {
      if (exc.value) {
        exc.value = redactString(exc.value);
      }
    });
  }

  // Scrub breadcrumb messages
  if (event.breadcrumbs) {
    event.breadcrumbs.forEach((breadcrumb) => {
      if (breadcrumb.message) {
        breadcrumb.message = redactString(breadcrumb.message);
      }
      if (breadcrumb.data) {
        Object.keys(breadcrumb.data).forEach((key) => {
          const value = breadcrumb.data![key];
          if (typeof value === 'string') {
            breadcrumb.data![key] = redactString(value);
          }
        });
      }
    });
  }

  // Scrub request/response bodies
  if (event.request?.url) {
    event.request.url = redactString(event.request.url);
  }

  return event;
}

/**
 * Attach user context (CYRUS: org scoping)
 *
 * Call this after user login/auth:
 * attachUserContext(userId, organizationId, email)
 */
export function attachUserContext(userId: string, organizationId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
  });

  // CYRUS: attach org scoping
  Sentry.setTag('organizationId', organizationId);
  Sentry.setTag('userId', userId);

  // Set context
  Sentry.setContext('organization', {
    id: organizationId,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  Sentry.setUser(null);
  Sentry.setTag('organizationId', 'anonymous');
  Sentry.setTag('userId', 'anonymous');
}

/**
 * Capture errors from clinical/ELENA endpoints
 * ELENA: tag with domain for priority alerting
 */
export function captureClinicError(error: Error, context: any) {
  Sentry.captureException(error, {
    tags: {
      domain: 'clinical', // P1 alert
      endpoint: context.endpoint || 'unknown',
    },
    contexts: {
      clinical: {
        encounterId: context.encounterId,
        patientId: context.patientId,
        ...context,
      },
    },
  });
}

/**
 * Capture performance issue
 */
export function capturePerformanceIssue(metric: string, value: number, threshold: number) {
  if (value > threshold) {
    Sentry.captureMessage(
      `Performance degradation: ${metric} = ${value}ms (threshold: ${threshold}ms)`,
      'warning',
      {
        tags: {
          type: 'performance',
          metric,
        },
        extra: {
          value,
          threshold,
          ratio: (value / threshold).toFixed(2),
        },
      }
    );
  }
}

/**
 * Manual transaction tracking
 *
 * Example:
 * const transaction = Sentry.startTransaction({
 *   op: 'http.server',
 *   name: 'POST /api/clinical/encounter',
 * });
 *
 * // ... do work
 *
 * transaction.finish();
 */
export function createTransaction(name: string, op: string = 'http.server') {
  return Sentry.startTransaction({
    op,
    name,
  });
}

/**
 * Breadcrumb tracking (automatic via integrations, but can add manually)
 *
 * Sentry.captureMessage('User logged in', 'info');
 * Sentry.captureMessage('Database query slow', 'warning');
 */

/**
 * Example setup in Next.js app/layout.tsx:
 *
 * 'use client';
 *
 * import { initSentryBrowser, attachUserContext } from '@/lib/sentry-config';
 * import { useEffect } from 'react';
 * import { useAuth } from '@/hooks/useAuth';
 *
 * initSentryBrowser();
 *
 * export default function RootLayout({ children }) {
 *   const { user } = useAuth();
 *
 *   useEffect(() => {
 *     if (user) {
 *       attachUserContext(user.id, user.organizationId, user.email);
 *     }
 *   }, [user]);
 *
 *   return <>{children}</>;
 * }
 */

/**
 * Example API error handler:
 *
 * import * as Sentry from '@sentry/nextjs';
 * import { captureClinicError } from '@/lib/sentry-config';
 *
 * export async function POST(req: NextRequest) {
 *   try {
 *     const encounter = await createEncounter(data);
 *     return NextResponse.json(encounter);
 *   } catch (error) {
 *     // Clinical error — P1 alert
 *     if (isClinicalError(error)) {
 *       captureClinicError(error as Error, {
 *         endpoint: '/api/clinical/encounter',
 *         encounterId: data.encounterId,
 *         patientId: data.patientId,
 *       });
 *     } else {
 *       Sentry.captureException(error);
 *     }
 *     throw error;
 *   }
 * }
 */

/**
 * Source map upload (CI/build step)
 *
 * Add to package.json:
 * "build": "next build && sentry-cli releases files upload-sourcemaps ./.next",
 *
 * Environment variables (in .env or CI secrets):
 * SENTRY_AUTH_TOKEN=<your-token>
 * SENTRY_ORG=holilabs
 * SENTRY_PROJECT=webapp
 */

export default {
  initSentryBrowser,
  initSentryServer,
  attachUserContext,
  clearUserContext,
  captureClinicError,
  capturePerformanceIssue,
  createTransaction,
};
