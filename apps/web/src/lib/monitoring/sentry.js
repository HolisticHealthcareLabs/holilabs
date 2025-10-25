"use strict";
/**
 * Sentry Error Monitoring Configuration
 *
 * Integrates Sentry for:
 * - Error tracking
 * - Performance monitoring
 * - User session replay (optional)
 * - Release tracking
 *
 * Setup Instructions:
 * 1. Create Sentry account: https://sentry.io/signup/
 * 2. Create new project (Next.js)
 * 3. Copy DSN to .env.production:
 *    SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
 *    NEXT_PUBLIC_SENTRY_DSN=same-as-above
 * 4. Run: pnpm add @sentry/nextjs
 * 5. Run: npx @sentry/wizard@latest -i nextjs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSentry = initSentry;
exports.captureError = captureError;
exports.setUserContext = setUserContext;
exports.clearUserContext = clearUserContext;
exports.addBreadcrumb = addBreadcrumb;
exports.startTransaction = startTransaction;
exports.isSentryEnabled = isSentryEnabled;
// Lazy import to avoid build-time errors when Sentry not installed
let Sentry;
try {
    // This will fail if @sentry/nextjs is not installed
    // Install with: pnpm add @sentry/nextjs
    Sentry = require('@sentry/nextjs');
}
catch (error) {
    console.warn('⚠️  Sentry not installed. Run: pnpm add @sentry/nextjs');
}
/**
 * Initialize Sentry (call this in app layout or middleware)
 */
function initSentry() {
    if (!Sentry) {
        console.warn('Sentry not configured - skipping initialization');
        return;
    }
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
        console.warn('SENTRY_DSN not set - error tracking disabled');
        return;
    }
    // Only initialize if not already initialized
    if (Sentry.isInitialized && Sentry.isInitialized()) {
        return;
    }
    Sentry.init({
        dsn,
        // Environment (production, staging, development)
        environment: process.env.NODE_ENV || 'development',
        // Release version (use git commit hash in production)
        release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'dev',
        // Sample rate for performance monitoring (0.0 to 1.0)
        // In production, use 0.1 (10%) to reduce costs
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Sample rate for session replays (0.0 to 1.0)
        // Only enable on errors in production
        replaysSessionSampleRate: 0.0,
        replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
        // Integrations
        integrations: [
            // Capture console errors
            Sentry.captureConsoleIntegration({
                levels: ['error'],
            }),
            // HTTP client errors
            Sentry.httpClientIntegration(),
            // Performance monitoring for web vitals
            Sentry.browserTracingIntegration(),
            // Session replay (disable in production if privacy concern)
            // Sentry.replayIntegration({
            //   maskAllText: true, // Mask PII
            //   blockAllMedia: true, // Block images/videos
            // }),
        ],
        // Don't send errors in development
        enabled: process.env.NODE_ENV === 'production',
        // Ignore certain errors
        ignoreErrors: [
            // Browser extensions
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured',
            // Network errors (expected)
            'NetworkError',
            'Failed to fetch',
            'Load failed',
            // User canceled actions
            'AbortError',
            'User cancelled',
        ],
        // Filter out sensitive data
        beforeSend(event, hint) {
            // Remove PHI from error messages
            if (event.message) {
                event.message = sanitizePHI(event.message);
            }
            // Remove PHI from breadcrumbs
            if (event.breadcrumbs) {
                event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
                    ...breadcrumb,
                    message: breadcrumb.message ? sanitizePHI(breadcrumb.message) : undefined,
                    data: breadcrumb.data ? sanitizeObject(breadcrumb.data) : undefined,
                }));
            }
            // Remove PHI from request data
            if (event.request) {
                if (event.request.data) {
                    event.request.data = sanitizeObject(event.request.data);
                }
                if (event.request.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
            }
            return event;
        },
    });
    console.log('✅ Sentry initialized');
}
/**
 * Sanitize PHI from strings
 */
function sanitizePHI(text) {
    if (!text)
        return text;
    // Remove email addresses
    text = text.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL_REDACTED]');
    // Remove phone numbers (various formats)
    text = text.replace(/\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, '[PHONE_REDACTED]');
    // Remove CURP (Mexican ID: 18 characters)
    text = text.replace(/[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d/g, '[CURP_REDACTED]');
    // Remove patient codes
    text = text.replace(/PT-[a-f0-9]{4,}/gi, '[PATIENT_REDACTED]');
    return text;
}
/**
 * Sanitize PHI from objects
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object')
        return obj;
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        // Skip sensitive keys
        if (['password', 'token', 'apiKey', 'secret', 'authorization'].includes(key.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
            continue;
        }
        // Skip PHI fields
        if (['email', 'phone', 'curp', 'ssn', 'firstName', 'lastName', 'birthDate'].includes(key)) {
            sanitized[key] = '[PHI_REDACTED]';
            continue;
        }
        // Recursively sanitize nested objects
        if (typeof obj[key] === 'object') {
            sanitized[key] = sanitizeObject(obj[key]);
        }
        else if (typeof obj[key] === 'string') {
            sanitized[key] = sanitizePHI(obj[key]);
        }
        else {
            sanitized[key] = obj[key];
        }
    }
    return sanitized;
}
/**
 * Manually capture an error
 */
function captureError(error, context) {
    if (!Sentry)
        return;
    Sentry.captureException(error, {
        extra: sanitizeObject(context),
    });
}
/**
 * Set user context (call after authentication)
 */
function setUserContext(user) {
    if (!Sentry)
        return;
    Sentry.setUser({
        id: user.id,
        // Don't send email to Sentry (PHI)
        // email: user.email,
        role: user.role,
    });
}
/**
 * Clear user context (call on logout)
 */
function clearUserContext() {
    if (!Sentry)
        return;
    Sentry.setUser(null);
}
/**
 * Add breadcrumb (for debugging error context)
 */
function addBreadcrumb(message, data) {
    if (!Sentry)
        return;
    Sentry.addBreadcrumb({
        message: sanitizePHI(message),
        level: 'info',
        data: sanitizeObject(data),
    });
}
/**
 * Start transaction (for performance monitoring)
 */
function startTransaction(name, op) {
    if (!Sentry)
        return null;
    return Sentry.startTransaction({
        name,
        op,
    });
}
/**
 * Check if Sentry is initialized
 */
function isSentryEnabled() {
    return Boolean(Sentry && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN));
}
//# sourceMappingURL=sentry.js.map