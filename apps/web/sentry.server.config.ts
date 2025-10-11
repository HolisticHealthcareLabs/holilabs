/**
 * Sentry Server-Side Configuration
 *
 * Captures errors and performance data from the Node.js server
 * Includes database queries and API route errors
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Only enable in production or when explicitly configured
  enabled: process.env.NODE_ENV === 'production' && !!SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  integrations: [
    // Prisma integration for database query tracing
    Sentry.prismaIntegration(),

    // Node.js profiling
    Sentry.nodeProfilingIntegration(),
  ],

  // Profile 10% of transactions in production
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Filter out sensitive data
  beforeSend(event, hint) {
    // Remove sensitive environment variables
    if (event.contexts?.runtime?.environment) {
      const env = event.contexts.runtime.environment as any;
      delete env.DATABASE_URL;
      delete env.NEXTAUTH_SECRET;
      delete env.SESSION_SECRET;
      delete env.ENCRYPTION_MASTER_KEY;
      delete env.ENCRYPTION_KEY;
      delete env.R2_ACCESS_KEY_ID;
      delete env.R2_SECRET_ACCESS_KEY;
      delete env.AWS_ACCESS_KEY_ID;
      delete env.AWS_SECRET_ACCESS_KEY;
      delete env.SUPABASE_SERVICE_ROLE_KEY;
      delete env.BLOCKCHAIN_PRIVATE_KEY;
      delete env.GOOGLE_CLIENT_SECRET;
      delete env.MICROSOFT_CLIENT_SECRET;
      delete env.RESEND_API_KEY;
      delete env.ANTHROPIC_API_KEY;
      delete env.UPSTASH_REDIS_REST_TOKEN;
      delete env.TWILIO_AUTH_TOKEN;
    }

    // Sanitize request data
    if (event.request) {
      // Remove sensitive headers
      if (event.request.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      // Sanitize cookies
      if (event.request.cookies) {
        delete event.request.cookies['patient-session'];
        delete event.request.cookies['next-auth.session-token'];
        delete event.request.cookies['__Secure-next-auth.session-token'];
      }

      // Sanitize query strings
      if (event.request.query_string) {
        event.request.query_string = event.request.query_string
          .replace(/token=[^&]*/g, 'token=[REDACTED]')
          .replace(/key=[^&]*/g, 'key=[REDACTED]')
          .replace(/secret=[^&]*/g, 'secret=[REDACTED]')
          .replace(/password=[^&]*/g, 'password=[REDACTED]')
          .replace(/apikey=[^&]*/g, 'apikey=[REDACTED]');
      }

      // Sanitize request body
      if (event.request.data) {
        const data = event.request.data as any;
        if (typeof data === 'object') {
          if (data.password) data.password = '[REDACTED]';
          if (data.token) data.token = '[REDACTED]';
          if (data.apiKey) data.apiKey = '[REDACTED]';
          if (data.secret) data.secret = '[REDACTED]';
        }
      }
    }

    // Add custom context
    if (event.contexts) {
      event.contexts.app = {
        app_name: 'Holi Labs',
        app_version: process.env.npm_package_version || 'unknown',
      };
    }

    return event;
  },

  // Ignore non-critical errors
  ignoreErrors: [
    // Network errors
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'socket hang up',
    // Database connection errors (transient)
    'connect ECONNREFUSED',
    'Connection terminated unexpectedly',
    // User aborted requests
    'AbortError',
    'The user aborted a request',
    // Next.js build errors (not runtime)
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Sample breadcrumbs (only keep important ones)
  beforeBreadcrumb(breadcrumb, hint) {
    // Skip console logs except errors
    if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
      return null;
    }

    // Skip HTTP requests to health checks
    if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/api/health')) {
      return null;
    }

    // Sanitize HTTP breadcrumbs
    if (breadcrumb.category === 'http' && breadcrumb.data) {
      delete breadcrumb.data['Authorization'];
      delete breadcrumb.data['Cookie'];
    }

    return breadcrumb;
  },
});
