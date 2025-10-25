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
import pino from 'pino';
declare let logger: pino.Logger;
export { logger };
/**
 * Create a child logger with additional context
 * Useful for tracking requests, users, or operations
 *
 * @example
 *   const requestLogger = createLogger({ requestId: 'abc-123' });
 *   requestLogger.info('Processing request');
 */
export declare const createLogger: (bindings: Record<string, any>) => pino.Logger<never>;
/**
 * Log levels (in order of severity):
 * - trace: Very detailed debugging (rarely used)
 * - debug: Debugging information
 * - info: General information (default in production)
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors (crashes)
 */
export type Logger = pino.Logger;
/**
 * Helper function to safely log errors
 * Handles cases where error might not be an Error object
 *
 * @example
 *   logger.error(logError(err), 'Failed to process payment');
 */
export declare const logError: (error: unknown) => {
    err: Error;
};
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
export declare const createApiLogger: (request?: Request) => Logger;
/**
 * Log performance metrics
 *
 * @example
 *   const start = Date.now();
 *   // ... do work ...
 *   logger.info(logPerformance('database-query', start), 'Query completed');
 */
export declare const logPerformance: (operation: string, startTime: number) => {
    operation: string;
    duration: number;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map