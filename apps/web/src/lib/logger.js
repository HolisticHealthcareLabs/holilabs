"use strict";
/**
 * Production-Grade Structured Logging with Pino
 *
 * Features:
 * - Structured JSON logs in production
 * - Pretty-printed logs in development
 * - Request ID tracking
 * - Automatic error serialization
 * - Log levels: trace, debug, info, warn, error, fatal
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *
 *   logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 *   logger.error({ err }, 'Failed to create patient');
 *   logger.warn({ duration: 2500 }, 'Slow database query');
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPerformance = exports.createApiLogger = exports.logError = exports.createLogger = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
// Detect if we're in a React Server Component context (App Router)
// In RSC, pino-pretty transport causes worker thread issues
const isRSC = typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs';
// TODO: Re-enable Logtail after fixing webpack bundling issues
// Temporarily disabled to allow build to complete
let logtail = null;
// Create base logger configuration
const pinoConfig = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    // Custom serializers for better error handling
    serializers: {
        err: pino_1.default.stdSerializers.err,
        error: pino_1.default.stdSerializers.err,
        req: pino_1.default.stdSerializers.req,
        res: pino_1.default.stdSerializers.res,
    },
    // Add timestamp
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    // Base context (always included)
    base: {
        env: process.env.NODE_ENV,
        app: 'holi-labs',
    },
    // Format output based on environment
    // IMPORTANT: Disable pino-pretty transport in RSC context to avoid worker thread errors
    ...(isDevelopment && !isRSC && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname,app,env',
                singleLine: false,
            },
        },
    }),
};
// Create logger instance
const baseLogger = (0, pino_1.default)(pinoConfig);
// Wrap logger to send to BetterStack in production
let logger;
if (logtail) {
    // Production with BetterStack - wrap the logger
    exports.logger = logger = new Proxy(baseLogger, {
        get(target, prop) {
            const originalMethod = target[prop];
            // Intercept logging methods
            if (typeof originalMethod === 'function' && ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(prop)) {
                return function (...args) {
                    // Call original Pino logger
                    const result = originalMethod.apply(target, args);
                    // Also send to Logtail
                    const [objOrMsg, msg] = args;
                    const logData = typeof objOrMsg === 'object' ? objOrMsg : {};
                    const logMessage = typeof objOrMsg === 'string' ? objOrMsg : msg;
                    logtail.log(logMessage, prop, logData);
                    return result;
                };
            }
            return originalMethod;
        }
    });
    baseLogger.info({
        event: 'betterstack_init',
        enabled: true,
    }, 'BetterStack logging enabled');
}
else {
    exports.logger = logger = baseLogger;
    if (isProduction) {
        baseLogger.warn({
            event: 'betterstack_init',
            enabled: false,
            reason: 'Missing LOGTAIL_SOURCE_TOKEN',
        }, 'BetterStack not configured - logs only in console');
    }
}
/**
 * Create a child logger with additional context
 * Useful for tracking requests, users, or operations
 *
 * @example
 *   const requestLogger = createLogger({ requestId: 'abc-123' });
 *   requestLogger.info('Processing request');
 */
const createLogger = (bindings) => {
    return logger.child(bindings);
};
exports.createLogger = createLogger;
/**
 * Helper function to safely log errors
 * Handles cases where error might not be an Error object
 *
 * @example
 *   logger.error(logError(err), 'Failed to process payment');
 */
const logError = (error) => {
    if (error instanceof Error) {
        return { err: error };
    }
    // Handle non-Error objects
    return {
        err: new Error(typeof error === 'string' ? error : JSON.stringify(error)),
    };
};
exports.logError = logError;
/**
 * Create a logger for API routes with request context
 * Automatically adds requestId for tracing
 *
 * @example
 *   export async function GET(request: NextRequest) {
 *     const log = createApiLogger(request);
 *     log.info('Fetching patients');
 *   }
 */
const createApiLogger = (request) => {
    // Generate or extract request ID
    const requestId = request?.headers.get('x-request-id') ||
        crypto.randomUUID();
    return (0, exports.createLogger)({
        requestId,
        method: request?.method,
        url: request?.url,
    });
};
exports.createApiLogger = createApiLogger;
/**
 * Log performance metrics
 *
 * @example
 *   const start = Date.now();
 *   // ... do work ...
 *   logger.info(logPerformance('database-query', start), 'Query completed');
 */
const logPerformance = (operation, startTime) => {
    return {
        operation,
        duration: Date.now() - startTime,
    };
};
exports.logPerformance = logPerformance;
// Export singleton logger as default
exports.default = logger;
//# sourceMappingURL=logger.js.map