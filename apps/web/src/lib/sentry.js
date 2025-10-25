"use strict";
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
exports.initSentry = initSentry;
exports.captureException = captureException;
exports.captureMessage = captureMessage;
exports.setUserContext = setUserContext;
exports.clearUserContext = clearUserContext;
exports.addBreadcrumb = addBreadcrumb;
const Sentry = __importStar(require("@sentry/nextjs"));
function initSentry() {
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
                        const message = error.message;
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
function captureException(error, context) {
    Sentry.captureException(error, {
        contexts: {
            custom: context,
        },
    });
}
// Helper to capture messages
function captureMessage(message, level = 'info') {
    Sentry.captureMessage(message, level);
}
// Helper to set user context
function setUserContext(user) {
    Sentry.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
    });
}
// Helper to clear user context on logout
function clearUserContext() {
    Sentry.setUser(null);
}
// Add breadcrumb for tracking user actions
function addBreadcrumb(message, category, data) {
    Sentry.addBreadcrumb({
        message,
        category,
        data,
        level: 'info',
    });
}
//# sourceMappingURL=sentry.js.map