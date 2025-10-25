"use strict";
/**
 * Sentry Utility Functions
 *
 * Helper functions for error reporting and monitoring with Sentry
 * Provides consistent error context and sanitization
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
exports.captureError = captureError;
exports.captureMessage = captureMessage;
exports.setUserContext = setUserContext;
exports.clearUserContext = clearUserContext;
exports.addBreadcrumb = addBreadcrumb;
exports.withErrorReporting = withErrorReporting;
exports.captureApiError = captureApiError;
exports.captureDatabaseError = captureDatabaseError;
exports.captureAuthError = captureAuthError;
exports.captureFileError = captureFileError;
exports.startTransaction = startTransaction;
exports.measurePerformance = measurePerformance;
exports.isSentryEnabled = isSentryEnabled;
const Sentry = __importStar(require("@sentry/nextjs"));
/**
 * Capture an exception with Sentry
 *
 * @example
 * ```typescript
 * try {
 *   await savePatient(data);
 * } catch (error) {
 *   captureError(error, {
 *     user: { id: userId, type: 'CLINICIAN' },
 *     tags: { feature: 'patient-management' },
 *     extra: { patientId: data.id },
 *   });
 * }
 * ```
 */
function captureError(error, context) {
    // Set user context if provided
    if (context?.user) {
        Sentry.setUser({
            id: context.user.id,
            email: context.user.email,
            role: context.user.role,
        });
    }
    // Set tags if provided
    if (context?.tags) {
        Sentry.setTags(context.tags);
    }
    // Capture the exception
    const eventId = Sentry.captureException(error, {
        level: context?.level || 'error',
        contexts: {
            custom: context?.extra,
        },
        fingerprint: context?.fingerprint,
    });
    return eventId;
}
/**
 * Capture a message with Sentry (non-error logging)
 *
 * @example
 * ```typescript
 * captureMessage('User completed onboarding', {
 *   level: 'info',
 *   user: { id: userId },
 *   tags: { feature: 'onboarding' },
 * });
 * ```
 */
function captureMessage(message, context) {
    // Set user context if provided
    if (context?.user) {
        Sentry.setUser({
            id: context.user.id,
            email: context.user.email,
            role: context.user.role,
        });
    }
    // Set tags if provided
    if (context?.tags) {
        Sentry.setTags(context.tags);
    }
    // Capture the message
    const eventId = Sentry.captureMessage(message, {
        level: context?.level || 'info',
        contexts: {
            custom: context?.extra,
        },
        fingerprint: context?.fingerprint,
    });
    return eventId;
}
/**
 * Set user context for all subsequent errors
 */
function setUserContext(user) {
    if (user) {
        Sentry.setUser({
            id: user.id,
            email: user.email,
            role: user.role,
            type: user.type,
        });
    }
    else {
        Sentry.setUser(null);
    }
}
/**
 * Clear user context
 */
function clearUserContext() {
    Sentry.setUser(null);
}
/**
 * Add breadcrumb for debugging
 *
 * @example
 * ```typescript
 * addBreadcrumb('User clicked save button', {
 *   category: 'ui.click',
 *   data: { patientId: '123' },
 * });
 * ```
 */
function addBreadcrumb(message, options) {
    Sentry.addBreadcrumb({
        message,
        category: options?.category || 'custom',
        level: options?.level || 'info',
        data: options?.data,
        timestamp: Date.now() / 1000,
    });
}
/**
 * Wrap an async function with error reporting
 *
 * @example
 * ```typescript
 * const savePatientSafe = withErrorReporting(
 *   async (data) => await savePatient(data),
 *   { tags: { feature: 'patient-management' } }
 * );
 * ```
 */
function withErrorReporting(fn, context) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            captureError(error, context);
            throw error; // Re-throw to allow caller to handle
        }
    });
}
/**
 * Report API error with context
 */
function captureApiError(error, endpoint, method, statusCode, requestId) {
    return captureError(error, {
        tags: {
            api_endpoint: endpoint,
            api_method: method,
            api_status: statusCode?.toString() || 'unknown',
        },
        extra: {
            requestId,
            endpoint,
            method,
            statusCode,
        },
    });
}
/**
 * Report database error with context
 */
function captureDatabaseError(error, operation, table, recordId) {
    return captureError(error, {
        tags: {
            db_operation: operation,
            db_table: table || 'unknown',
        },
        extra: {
            operation,
            table,
            recordId,
        },
    });
}
/**
 * Report authentication error
 */
function captureAuthError(error, authType, userId) {
    return captureError(error, {
        tags: {
            auth_type: authType,
        },
        extra: {
            authType,
            userId,
        },
    });
}
/**
 * Report file operation error
 */
function captureFileError(error, operation, fileName, fileSize) {
    return captureError(error, {
        tags: {
            file_operation: operation,
        },
        extra: {
            operation,
            fileName,
            fileSize,
        },
    });
}
/**
 * Start a performance transaction
 *
 * @example
 * ```typescript
 * const transaction = startTransaction('patient.save', 'db.operation');
 * try {
 *   await savePatient(data);
 * } finally {
 *   transaction.finish();
 * }
 * ```
 */
// TODO: Sentry.Transaction API has been deprecated - use startSpan instead
// Commenting out to allow build to pass
function startTransaction(name, op) {
    // return Sentry.startTransaction({
    //   name,
    //   op,
    // });
    console.warn('startTransaction is deprecated - use Sentry.startSpan instead');
    return undefined;
}
/**
 * Measure async function performance
 *
 * @example
 * ```typescript
 * const result = await measurePerformance(
 *   'patient.save',
 *   async () => await savePatient(data)
 * );
 * ```
 */
async function measurePerformance(name, fn) {
    const transaction = startTransaction(name, 'function');
    try {
        const result = await fn();
        transaction?.setStatus('ok');
        return result;
    }
    catch (error) {
        transaction?.setStatus('internal_error');
        throw error;
    }
    finally {
        transaction?.finish();
    }
}
/**
 * Check if Sentry is enabled
 */
function isSentryEnabled() {
    return (process.env.NODE_ENV === 'production' &&
        !!process.env.NEXT_PUBLIC_SENTRY_DSN);
}
//# sourceMappingURL=sentry-utils.js.map