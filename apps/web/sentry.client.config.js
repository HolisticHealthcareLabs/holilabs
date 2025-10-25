"use strict";
/**
 * Sentry Client-Side Configuration
 *
 * Captures errors and performance data from the browser
 * Integrates with React error boundaries
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Sentry = __importStar(require("@sentry/nextjs"));
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
Sentry.init({
    dsn: SENTRY_DSN,
    // Environment
    environment: process.env.NODE_ENV || 'development',
    // Only enable in production or when explicitly configured
    enabled: process.env.NODE_ENV === 'production' && !!SENTRY_DSN,
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
    // Trace propagation targets
    tracePropagationTargets: [
        'localhost',
        /^https:\/\/.*\.holilabs\.com/,
        /^https:\/\/.*\.ondigitalocean\.app/,
    ],
    integrations: [
        Sentry.replayIntegration({
            // Mask all text and input content for privacy
            maskAllText: true,
            blockAllMedia: true,
        }),
        Sentry.browserTracingIntegration(),
    ],
    // Filter out sensitive data
    beforeSend(event, hint) {
        // Remove sensitive cookies
        if (event.request?.cookies) {
            const cookies = event.request.cookies;
            delete cookies['patient-session'];
            delete cookies['next-auth.session-token'];
            delete cookies['__Secure-next-auth.session-token'];
        }
        // Remove sensitive headers
        if (event.request?.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
        }
        // Remove sensitive query params
        if (event.request?.query_string) {
            if (typeof event.request.query_string === 'string') {
                event.request.query_string = event.request.query_string
                    .replace(/token=[^&]*/g, 'token=[REDACTED]')
                    .replace(/key=[^&]*/g, 'key=[REDACTED]')
                    .replace(/secret=[^&]*/g, 'secret=[REDACTED]');
            }
        }
        // Don't send errors from browser extensions
        if (hint?.originalException && typeof hint.originalException === 'object') {
            const error = hint.originalException;
            if (error?.message?.includes('extension://')) {
                return null;
            }
        }
        return event;
    },
    // Ignore common non-critical errors
    ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        // Network errors
        'NetworkError',
        'Network request failed',
        'Failed to fetch',
        // User canceled actions
        'AbortError',
        'The user aborted a request',
        // WebRTC errors
        'NotAllowedError',
        'NotFoundError: Requested device not found',
        // Safari specific
        'Invariant Violation',
        // Common user-caused errors
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
    ],
    // Capture console errors (only errors and warnings)
    beforeBreadcrumb(breadcrumb, hint) {
        if (breadcrumb.category === 'console') {
            if (breadcrumb.level !== 'error' && breadcrumb.level !== 'warning') {
                return null;
            }
        }
        return breadcrumb;
    },
});
//# sourceMappingURL=sentry.client.config.js.map