"use strict";
/**
 * Sentry Edge Runtime Configuration
 *
 * Captures errors from Next.js Edge Runtime (middleware, edge API routes)
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
            if (typeof event.request.query_string === 'string') {
                event.request.query_string = event.request.query_string
                    .replace(/token=[^&]*/g, 'token=[REDACTED]')
                    .replace(/key=[^&]*/g, 'key=[REDACTED]')
                    .replace(/secret=[^&]*/g, 'secret=[REDACTED]');
            }
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
//# sourceMappingURL=sentry.edge.config.js.map