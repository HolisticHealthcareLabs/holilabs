/**
 * Structured JSON Logging for Production (HoliLabs)
 * - Winston or Pino configuration with JSON formatter
 * - Log levels: error, warn, info, debug, trace
 * - Standard fields: timestamp, level, service, organizationId, userId, requestId, traceId
 * - CYRUS: PHI fields (patientName, cpf, cns) NEVER logged — use patientId only
 * - Request/response logging middleware (body size, status code, latency, route)
 * - Correlation ID propagation (X-Request-Id header through async context)
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Async context store for request-scoped data
 */
interface RequestContext {
  requestId: string;
  traceId: string;
  userId?: string;
  organizationId?: string;
  startTime: number;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Pino logger configuration
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: false,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  formatters: {
    // Add standard fields to every log
    bindings: (bindings) => {
      return {
        service: 'holilabs-api',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.RELEASE || '0.0.0',
        ...bindings,
      };
    },

    level: (label) => {
      return { level: label };
    },
  },

  // Base serializers
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },

  // Redact sensitive fields (CYRUS)
  redact: {
    paths: [
      'patientName',
      'cpf',
      'cns',
      'rg',
      'email',
      'phone',
      'ssn',
      'password',
      'token',
      'apiKey',
      'authorization',
    ],
    remove: true,
  },
});

/**
 * Get current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Set request context (call in middleware)
 */
export function setRequestContext(context: RequestContext) {
  return requestContext.run(context, () => context);
}

/**
 * Attach context to logger instance
 */
export function createContextualLogger(context: RequestContext) {
  return logger.child({
    requestId: context.requestId,
    traceId: context.traceId,
    userId: context.userId,
    organizationId: context.organizationId,
  });
}

/**
 * Request/response logging middleware
 */
export function loggingMiddleware(req: NextRequest): RequestContext {
  const requestId = req.headers.get('X-Request-Id') || uuidv4();
  const traceId = req.headers.get('X-Trace-Id') || uuidv4();

  const context: RequestContext = {
    requestId,
    traceId,
    startTime: Date.now(),
  };

  // Extract user context if available (from JWT)
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      // Stub: decode JWT to get userId, organizationId
      // const decoded = decodeJWT(authHeader);
      // context.userId = decoded.sub;
      // context.organizationId = decoded.org_id;
    } catch {
      // Ignore auth parsing errors
    }
  }

  // Log incoming request
  const contextLogger = createContextualLogger(context);
  const url = new URL(req.url);

  contextLogger.info(
    {
      method: req.method,
      path: url.pathname,
      query: url.search,
      userAgent: req.headers.get('User-Agent'),
      remoteAddr: req.headers.get('X-Forwarded-For') || req.headers.get('X-Real-IP'),
      // CYRUS: don't log request body if it contains PHI
      bodySize: req.headers.get('Content-Length'),
    },
    'incoming request'
  );

  return context;
}

/**
 * Response logging wrapper
 */
export function logResponse(context: RequestContext, status: number, headers: Record<string, string>) {
  const contextLogger = createContextualLogger(context);
  const latencyMs = Date.now() - context.startTime;

  // Determine log level by status
  let level: 'info' | 'warn' | 'error' = 'info';
  if (status >= 500) {
    level = 'error';
  } else if (status >= 400) {
    level = 'warn';
  }

  const logFn = contextLogger[level].bind(contextLogger);

  logFn(
    {
      statusCode: status,
      latencyMs,
      responseTime: headers['X-Response-Time'],
      contentType: headers['Content-Type'],
      contentLength: headers['Content-Length'],
      cacheControl: headers['Cache-Control'],
      // CYRUS: include ratelimit info (no PHI)
      rateLimitRemaining: headers['X-RateLimit-Remaining'],
      rateLimitReset: headers['X-RateLimit-Reset'],
    },
    'outgoing response'
  );
}

/**
 * Clinical logging (ELENA: audit trail)
 */
export function logClinicalEvent(
  action: 'create' | 'read' | 'update' | 'delete',
  entity: 'encounter' | 'prescription' | 'lab-result' | 'consent',
  context: {
    encounterId: string;
    patientId: string; // CYRUS: no patientName
    userId: string;
    organizationId: string;
    outcome: 'success' | 'failure';
    reason?: string;
  }
) {
  const logger = createContextualLogger({
    requestId: context.encounterId,
    traceId: uuidv4(),
    userId: context.userId,
    organizationId: context.organizationId,
    startTime: Date.now(),
  });

  logger.info(
    {
      domain: 'clinical',
      action,
      entity,
      encounterId: context.encounterId,
      patientId: context.patientId,
      outcome: context.outcome,
      reason: context.reason,
      timestamp: new Date().toISOString(),
    },
    `clinical:${action}:${entity}`
  );
}

/**
 * Database query logging
 */
export function logDbQuery(
  query: string,
  params: any[],
  duration: number,
  rowCount: number,
  error?: Error
) {
  const context = getRequestContext();
  const log = context ? createContextualLogger(context) : logger;

  const level = error ? 'error' : duration > 1000 ? 'warn' : 'debug';
  const logFn = log[level as keyof typeof log].bind(log);

  logFn(
    {
      type: 'database',
      query: query.substring(0, 500), // truncate long queries
      paramCount: params.length,
      durationMs: duration,
      rowCount,
      error: error?.message,
    },
    'database query'
  );
}

/**
 * API client call logging
 */
export function logApiCall(
  service: string,
  method: string,
  path: string,
  status: number,
  duration: number,
  error?: Error
) {
  const context = getRequestContext();
  const log = context ? createContextualLogger(context) : logger;

  const level = error || status >= 400 ? 'warn' : 'debug';
  const logFn = log[level as keyof typeof log].bind(log);

  logFn(
    {
      type: 'external_api',
      service,
      method,
      path,
      statusCode: status,
      durationMs: duration,
      error: error?.message,
    },
    `api call: ${service} ${method} ${path}`
  );
}

/**
 * Performance metric logging
 */
export function logPerformanceMetric(metric: string, value: number, unit: string = 'ms') {
  const context = getRequestContext();
  const log = context ? createContextualLogger(context) : logger;

  log.info(
    {
      type: 'performance',
      metric,
      value,
      unit,
    },
    `performance: ${metric}`
  );
}

/**
 * Example Next.js API route handler with full logging:
 *
 * import { NextRequest, NextResponse } from 'next/server';
 * import { logger, loggingMiddleware, logResponse, logClinicalEvent } from '@/lib/logging';
 *
 * export async function POST(req: NextRequest) {
 *   const context = loggingMiddleware(req);
 *
 *   try {
 *     const data = await req.json();
 *
 *     // Process request
 *     const result = await processEncounter(data);
 *
 *     // Log clinical event
 *     logClinicalEvent('create', 'encounter', {
 *       encounterId: result.id,
 *       patientId: data.patientId, // don't log patientName
 *       userId: context.userId!,
 *       organizationId: context.organizationId!,
 *       outcome: 'success',
 *     });
 *
 *     const response = NextResponse.json(result, { status: 201 });
 *     logResponse(context, 201, Object.fromEntries(response.headers));
 *     return response;
 *   } catch (error) {
 *     logClinicalEvent('create', 'encounter', {
 *       encounterId: 'unknown',
 *       patientId: data.patientId,
 *       userId: context.userId!,
 *       organizationId: context.organizationId!,
 *       outcome: 'failure',
 *       reason: error instanceof Error ? error.message : 'unknown',
 *     });
 *
 *     const response = NextResponse.json({ error: 'Internal error' }, { status: 500 });
 *     logResponse(context, 500, Object.fromEntries(response.headers));
 *     return response;
 *   }
 * }
 */

export default logger;
