/**
 * Server-only structured logger (Pino + optional S3 shipping).
 *
 * IMPORTANT:
 * - Do not import this file from client components.
 * - `@/lib/logger` provides a safe shim that uses this only on the server.
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

  logger.info(
    {
      event: 's3_logging_init',
      enabled: true,
      bucket: process.env.LOG_BUCKET_NAME,
      retention: '6 years (HIPAA compliant)',
    },
    'S3 log shipping enabled'
  );
} else if (isProduction && !isS3LoggingEnabled()) {
  // Production without S3 - console only with warning
  logger = pino(pinoConfig);

  logger.warn(
    {
      event: 's3_logging_init',
      enabled: false,
      reason: 'Missing LOG_BUCKET_NAME or AWS credentials',
      recommendation: 'Configure S3 logging for HIPAA compliance (6-year retention required)',
    },
    'S3 logging not configured - logs only in console'
  );
} else {
  // Development - console only
  logger = pino(pinoConfig);
}

export { logger };

export type Logger = pino.Logger;

export const createLogger = (bindings: Record<string, any>) => {
  return logger.child(bindings);
};

export const logError = (error: unknown): { err: Error } => {
  if (error instanceof Error) return { err: error };
  return { err: new Error(typeof error === 'string' ? error : JSON.stringify(error)) };
};

export const createApiLogger = (request?: Request): Logger => {
  const requestId = request?.headers.get('x-request-id') || crypto.randomUUID();
  return createLogger({
    requestId,
    method: request?.method,
    url: request?.url,
  });
};

export const logPerformance = (operation: string, startTime: number): { operation: string; duration: number } => {
  return { operation, duration: Date.now() - startTime };
};

export default logger;

