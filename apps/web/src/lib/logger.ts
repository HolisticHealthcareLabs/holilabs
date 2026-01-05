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
import { createS3Transport, isS3LoggingEnabled } from './logging/s3-transport';

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Detect if we're in a React Server Component context (App Router)
// In RSC, pino-pretty transport causes worker thread issues
const isRSC = typeof window === 'undefined' && process.env.NEXT_RUNTIME === 'nodejs';

// Create base logger configuration
const pinoConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Custom serializers for better error handling
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,

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

// Create logger instance with S3 transport in production
let logger: pino.Logger;

if (isProduction && isS3LoggingEnabled() && !isRSC) {
  // Production with S3 logging - use multistream to write to both console and S3
  const streams: pino.StreamEntry[] = [
    { stream: process.stdout }, // Console output
    { stream: createS3Transport() }, // S3 storage
  ];

  logger = pino(pinoConfig, pino.multistream(streams));

  logger.info({
    event: 's3_logging_init',
    enabled: true,
    bucket: process.env.LOG_BUCKET_NAME,
    retention: '6 years (HIPAA compliant)',
  }, 'S3 log shipping enabled');
} else if (isProduction && !isS3LoggingEnabled()) {
  // Production without S3 - console only with warning
  logger = pino(pinoConfig);

  logger.warn({
    event: 's3_logging_init',
    enabled: false,
    reason: 'Missing LOG_BUCKET_NAME or AWS credentials',
    recommendation: 'Configure S3 logging for HIPAA compliance (6-year retention required)',
  }, 'S3 logging not configured - logs only in console');
} else {
  // Development - console only
  logger = pino(pinoConfig);
}

export { logger };

/**
 * Create a child logger with additional context
 * Useful for tracking requests, users, or operations
 *
 * @example
 *   const requestLogger = createLogger({ requestId: 'abc-123' });
 *   requestLogger.info('Processing request');
 */
export const createLogger = (bindings: Record<string, any>) => {
  return logger.child(bindings);
};

/**
 * Log levels (in order of severity):
 * - trace: Very detailed debugging (rarely used)
 * - debug: Debugging information
 * - info: General information (default in production)
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors (crashes)
 */

// Export convenience types
export type Logger = pino.Logger;

/**
 * Helper function to safely log errors
 * Handles cases where error might not be an Error object
 *
 * @example
 *   logger.error(logError(err), 'Failed to process payment');
 */
export const logError = (error: unknown): { err: Error } => {
  if (error instanceof Error) {
    return { err: error };
  }

  // Handle non-Error objects
  return {
    err: new Error(
      typeof error === 'string' ? error : JSON.stringify(error)
    ),
  };
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
export const createApiLogger = (request?: Request): Logger => {
  // Generate or extract request ID
  const requestId =
    request?.headers.get('x-request-id') ||
    crypto.randomUUID();

  return createLogger({
    requestId,
    method: request?.method,
    url: request?.url,
  });
};

/**
 * Log performance metrics
 *
 * @example
 *   const start = Date.now();
 *   // ... do work ...
 *   logger.info(logPerformance('database-query', start), 'Query completed');
 */
export const logPerformance = (
  operation: string,
  startTime: number
): { operation: string; duration: number } => {
  return {
    operation,
    duration: Date.now() - startTime,
  };
};

// Export singleton logger as default
export default logger;
