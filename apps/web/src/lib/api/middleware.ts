/**
 * API Middleware Utilities
 * Industry-grade request handling, validation, and security
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { csrfProtection } from '@/lib/security/csrf';
import { handlePreflight, applyCorsHeaders } from './cors';
import { getOrCreateRequestId, REQUEST_ID_HEADER } from '@/lib/request-id';
import { logger, createLogger, logError } from '@/lib/logger';
import { applySecurityHeaders } from './security-headers';
import { Redis } from '@upstash/redis';

// ============================================================================
// TYPES
// ============================================================================

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse> | NextResponse;

export interface ApiContext {
  params?: Record<string, string>;
  requestId?: string; // Request ID for tracing
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

// ============================================================================
// RATE LIMITING (Redis-backed with in-memory fallback)
// ============================================================================

// Initialize Redis client (only if credentials are available)
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  logger.info({
    event: 'redis_client_init',
    enabled: true,
  }, 'Redis rate limiting enabled');
} else {
  logger.warn({
    event: 'redis_client_init',
    enabled: false,
    reason: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN',
  }, 'Redis not configured - falling back to in-memory rate limiting');
}

// In-memory fallback (for development or when Redis is unavailable)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_STORE_SIZE = 10000;

// Cleanup for in-memory store
setInterval(() => {
  if (redis) return; // Skip if using Redis
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, value] of entries) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const identifier = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';

    // Hash the URL to keep keys short
    const urlHash = Buffer.from(request.url).toString('base64').slice(0, 20);
    const key = `ratelimit:${identifier}:${urlHash}`;
    const now = Date.now();
    const windowSeconds = Math.ceil(config.windowMs / 1000);

    const log = createLogger({ requestId: context.requestId, identifier });

    // ========================================================================
    // REDIS IMPLEMENTATION (Production)
    // ========================================================================
    if (redis) {
      try {
        const count = await redis.incr(key);

        // Set expiration on first request
        if (count === 1) {
          await redis.expire(key, windowSeconds);
        }

        const remaining = Math.max(0, config.maxRequests - count);
        const resetAt = now + (config.windowMs);

        if (count > config.maxRequests) {
          const ttl = await redis.ttl(key);
          const resetIn = ttl > 0 ? ttl : windowSeconds;

          log.warn({
            event: 'rate_limit_exceeded',
            maxRequests: config.maxRequests,
            currentCount: count,
            resetIn,
            url: request.url,
            backend: 'redis',
          }, 'Rate limit exceeded (Redis)');

          return NextResponse.json(
            {
              error: 'Rate limit exceeded',
              retryAfter: resetIn,
            },
            {
              status: 429,
              headers: {
                'Retry-After': resetIn.toString(),
                'X-RateLimit-Limit': config.maxRequests.toString(),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
              },
            }
          );
        }

        const response = await next();

        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

        return response;
      } catch (error) {
        log.error({
          ...logError(error),
          event: 'redis_rate_limit_error',
        }, 'Redis rate limiting failed - falling back to in-memory');
        // Fall through to in-memory implementation
      }
    }

    // ========================================================================
    // IN-MEMORY FALLBACK (Development or Redis failure)
    // ========================================================================

    // Enforce max store size
    if (rateLimitStore.size > MAX_STORE_SIZE) {
      const entries = Array.from(rateLimitStore.entries())
        .sort((a, b) => a[1].resetAt - b[1].resetAt)
        .slice(0, 1000);
      entries.forEach(([k]) => rateLimitStore.delete(k));
    }

    const record = rateLimitStore.get(key);

    // Clean up expired records
    if (record && now > record.resetAt) {
      rateLimitStore.delete(key);
    }

    const current = rateLimitStore.get(key);

    if (!current) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return next();
    }

    if (current.count >= config.maxRequests) {
      const resetIn = Math.ceil((current.resetAt - now) / 1000);

      log.warn({
        event: 'rate_limit_exceeded',
        maxRequests: config.maxRequests,
        resetIn,
        url: request.url,
        backend: 'in-memory',
      }, 'Rate limit exceeded (in-memory)');

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: resetIn,
        },
        {
          status: 429,
          headers: {
            'Retry-After': resetIn.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': current.resetAt.toString(),
          },
        }
      );
    }

    current.count++;
    rateLimitStore.set(key, current);

    const response = await next();

    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (config.maxRequests - current.count).toString());
    response.headers.set('X-RateLimit-Reset', current.resetAt.toString());

    return response;
  };
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

export function requireAuth() {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    try {
      const log = createLogger({ requestId: context.requestId });

      // Skip authentication in test environment
      if (process.env.NODE_ENV === 'test') {
        context.user = {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'CLINICIAN',
        };
        return next();
      }

      // ===================================================================
      // NEXTAUTH v5 SESSION AUTHENTICATION
      // ===================================================================
      // Use proper NextAuth v5 session validation for HIPAA compliance
      // ===================================================================

      // Import NextAuth auth function
      const { getServerSession } = await import('@/lib/auth');
      const session = await getServerSession();

      // Validate session exists and has user
      if (!session || !session.user || !session.user.id) {
        log.warn({
          event: 'auth_session_missing',
          path: request.url,
        }, 'No valid session found');

        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Verify user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      });

      if (!dbUser) {
        log.warn({
          event: 'auth_user_not_found',
          userId: session.user.id,
          email: session.user.email,
        }, 'User from session not found in database');

        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      // Attach validated user to context
      context.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      };

      log.debug({
        event: 'auth_success',
        userId: dbUser.id,
        role: dbUser.role,
      }, 'Authentication successful');

      return next();
    } catch (error) {
      const log = createLogger({ requestId: context.requestId });
      log.error(logError(error), 'Authentication middleware error');

      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

export type UserRole = 'ADMIN' | 'CLINICIAN' | 'NURSE' | 'STAFF' | 'PATIENT';

export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    if (!context.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(context.user.role as UserRole)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: context.user.role,
        },
        { status: 403 }
      );
    }

    return next();
  };
}

// ============================================================================
// IDOR PROTECTION (Insecure Direct Object Reference)
// @compliance Phase 2.4: Security Hardening
// ============================================================================

/**
 * Verify patient access for IDOR protection
 * Checks if the authenticated user has permission to access a patient's data
 */
export async function verifyPatientAccess(
  userId: string,
  patientId: string,
  options?: {
    accessReason?: string;
    breakGlass?: boolean;
    ipAddress?: string;
  }
): Promise<boolean> {
  try {
    // Check if user is the patient themselves (for patient portal)
    const patientUser = await prisma.patientUser.findUnique({
      where: { id: userId },
      select: { patientId: true },
    });

    if (patientUser && patientUser.patientId === patientId) {
      return true;
    }

    // PHASE 1: Check explicit access grants (DataAccessGrant table)
    const activeGrant = await prisma.dataAccessGrant.findFirst({
      where: {
        patientId,
        grantedToId: userId,
        OR: [
          { expiresAt: null }, // Permanent grant
          { expiresAt: { gte: new Date() } }, // Not expired
        ],
        revokedAt: null,
      },
      select: {
        id: true,
        accessLevel: true,
        purpose: true,
      },
    });

    if (activeGrant) {
      logger.info({
        event: 'patient_access_granted',
        userId,
        patientId,
        grantId: activeGrant.id,
        accessLevel: activeGrant.accessLevel,
        purpose: activeGrant.purpose,
      });
      return true;
    }

    // PHASE 2: Check if patient is assigned to this clinician
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { assignedClinicianId: true },
    });

    if (patient?.assignedClinicianId === userId) {
      return true;
    }

    // PHASE 3: Check clinical relationship (SOAP notes, prescriptions, appointments)
    const [soapNotes, prescriptions, appointments] = await Promise.all([
      prisma.sOAPNote.findFirst({
        where: { patientId, clinicianId: userId },
        select: { id: true },
      }),
      prisma.prescription.findFirst({
        where: { patientId, clinicianId: userId },
        select: { id: true },
      }),
      prisma.appointment.findFirst({
        where: { patientId, clinicianId: userId },
        select: { id: true },
      }),
    ]);

    if (soapNotes || prescriptions || appointments) {
      return true;
    }

    // PHASE 4: Break-glass emergency access (requires access reason)
    if (options?.breakGlass && options?.accessReason) {
      logger.warn({
        event: 'break_glass_access',
        userId,
        patientId,
        accessReason: options.accessReason,
        ipAddress: options.ipAddress,
        timestamp: new Date().toISOString(),
      });

      // Create audit log for break-glass access
      await prisma.auditLog.create({
        data: {
          userId,
          userEmail: '', // Will be filled by middleware
          ipAddress: options.ipAddress || 'unknown',
          action: 'BREAK_GLASS_ACCESS',
          resource: 'Patient',
          resourceId: patientId,
          details: {
            accessReason: options.accessReason,
            breakGlass: true,
            warning: 'Emergency access without explicit grant',
          },
          success: true,
        },
      });

      return true; // Allow emergency access
    }

    // No access
    logger.warn({
      event: 'patient_access_denied',
      userId,
      patientId,
      reason: 'no_access_grant_or_clinical_relationship',
    });

    return false;
  } catch (error) {
    logger.error({
      event: 'verify_patient_access_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      patientId,
    });
    return false;
  }
}

/**
 * Middleware to protect patient-specific routes from IDOR attacks
 * Verifies that the authenticated user has permission to access the patient data
 */
export function requirePatientAccess() {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    if (!context.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Extract patient ID from params or query
    const patientId = context.params?.id || context.params?.patientId;

    if (!patientId) {
      // If no patient ID in route, check query params
      const { searchParams } = new URL(request.url);
      const queryPatientId = searchParams.get('patientId');

      if (!queryPatientId) {
        return NextResponse.json(
          { error: 'Patient ID required' },
          { status: 400 }
        );
      }

      // Verify access for query param patient ID
      const hasAccess = await verifyPatientAccess(context.user.id, queryPatientId);

      if (!hasAccess) {
        const log = createLogger({ requestId: context.requestId, userId: context.user.id });
        log.warn({
          event: 'unauthorized_patient_access_attempt',
          patientId: queryPatientId,
          path: request.url,
        });

        return NextResponse.json(
          { error: 'You do not have permission to access this patient record' },
          { status: 403 }
        );
      }

      return next();
    }

    // Verify access for route param patient ID
    const hasAccess = await verifyPatientAccess(context.user.id, patientId);

    if (!hasAccess) {
      const log = createLogger({ requestId: context.requestId, userId: context.user.id });
      log.warn({
        event: 'unauthorized_patient_access_attempt',
        patientId,
        path: request.url,
      });

      return NextResponse.json(
        { error: 'You do not have permission to access this patient record' },
        { status: 403 }
      );
    }

    return next();
  };
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export function validateBody<T extends z.ZodType>(schema: T) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    try {
      const body = await request.json();
      const validated = schema.parse(body);

      // Attach validated data to context
      (context as any).validatedBody = validated;

      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}

export function validateQuery<T extends z.ZodType>(schema: T) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = Object.fromEntries(searchParams.entries());
      const validated = schema.parse(query);

      // Attach validated data to context
      (context as any).validatedQuery = validated;

      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Query validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
    }
  };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export function withErrorHandling(handler: ApiHandler) {
  return async (request: NextRequest, context: ApiContext) => {
    const startTime = Date.now();
    const log = createLogger({
      requestId: context.requestId,
      method: request.method,
      url: request.url,
    });

    try {
      log.info('API request started');
      const response = await handler(request, context);
      const duration = Date.now() - startTime;

      log.info({
        event: 'api_request_completed',
        status: response.status,
        duration,
      }, 'API request completed');

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      log.error({
        ...logError(error),
        event: 'api_error',
        duration,
        errorCode: error.code,
      }, 'API request failed');

      // Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A record with this value already exists' },
          { status: 409 }
        );
      }

      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Record not found' },
          { status: 404 }
        );
      }

      // Generic error
      return NextResponse.json(
        {
          error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : error.message,
        },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// CORS HEADERS
// ============================================================================

export function withCORS(response: NextResponse, allowedOrigins: string[] = ['*']) {
  const origin = allowedOrigins.includes('*') ? '*' : allowedOrigins.join(',');

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

// ============================================================================
// MIDDLEWARE COMPOSITION
// ============================================================================

type Middleware = (
  request: NextRequest,
  context: ApiContext,
  next: () => Promise<NextResponse>
) => Promise<NextResponse>;

export function compose(...middlewares: Middleware[]) {
  return (handler: ApiHandler): ApiHandler => {
    return async (request: NextRequest, context: ApiContext) => {
      let index = 0;

      const next = async (): Promise<NextResponse> => {
        if (index < middlewares.length) {
          const middleware = middlewares[index++];
          return middleware(request, context, next);
        }
        return handler(request, context);
      };

      return next();
    };
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export function withAuditLog(action: string, resource: string) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const start = Date.now();
    const response = await next();
    const duration = Date.now() - start;

    // Log async (don't block response)
    (async () => {
      const log = createLogger({ requestId: context.requestId, userId: context.user?.id });

      try {
        await prisma.auditLog.create({
          data: {
            userId: context.user?.id,
            userEmail: context.user?.email || 'anonymous',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            action: action as any, // Cast to avoid type error with string
            resource,
            resourceId: context.params?.id || 'N/A',
            success: response.status < 400,
            details: {
              method: request.method,
              url: request.url,
              duration,
              statusCode: response.status,
            },
          },
        });

        log.info({
          event: 'audit_log_created',
          action,
          resource,
          success: response.status < 400,
        }, 'Audit log created');
      } catch (error) {
        log.error(logError(error), 'Failed to create audit log');
      }
    })();

    return response;
  };
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Create a protected API route with authentication, rate limiting, CSRF protection, and error handling
 */
export function createProtectedRoute(
  handler: ApiHandler,
  options?: {
    roles?: UserRole[];
    rateLimit?: RateLimitConfig;
    audit?: { action: string; resource: string };
    skipCsrf?: boolean; // Option to disable CSRF for specific routes (e.g., GET-only)
  }
) {
  return async (request: NextRequest, context: ApiContext) => {
    // Generate or extract request ID
    const requestId = getOrCreateRequestId(request.headers);
    context.requestId = requestId;

    // Handle CORS preflight
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      preflightResponse.headers.set(REQUEST_ID_HEADER, requestId);
      return preflightResponse;
    }

    const middlewares: Middleware[] = [requireAuth()];

    // Add CSRF protection by default for all protected routes (skip only if explicitly disabled)
    if (!options?.skipCsrf) {
      middlewares.push(csrfProtection());
    }

    if (options?.rateLimit) {
      middlewares.push(rateLimit(options.rateLimit));
    }

    if (options?.roles) {
      middlewares.push(requireRole(...options.roles));
    }

    if (options?.audit) {
      middlewares.push(withAuditLog(options.audit.action, options.audit.resource));
    }

    const composedHandler = withErrorHandling(compose(...middlewares)(handler));
    let response = await composedHandler(request, context);

    // Apply request ID, CORS, and security headers to response
    response.headers.set(REQUEST_ID_HEADER, requestId);
    response = applyCorsHeaders(request, response);
    response = applySecurityHeaders(response);

    return response;
  };
}

/**
 * Create a public API route with rate limiting and error handling
 */
export function createPublicRoute(
  handler: ApiHandler,
  options?: {
    rateLimit?: RateLimitConfig;
  }
) {
  return async (request: NextRequest, context: ApiContext) => {
    // Generate or extract request ID
    const requestId = getOrCreateRequestId(request.headers);
    context.requestId = requestId;

    // Handle CORS preflight
    const preflightResponse = handlePreflight(request);
    if (preflightResponse) {
      preflightResponse.headers.set(REQUEST_ID_HEADER, requestId);
      return preflightResponse;
    }

    const middlewares: Middleware[] = [];

    if (options?.rateLimit) {
      middlewares.push(rateLimit(options.rateLimit));
    }

    const composedHandler = withErrorHandling(compose(...middlewares)(handler));
    let response = await composedHandler(request, context);

    // Apply request ID, CORS, and security headers to response
    response.headers.set(REQUEST_ID_HEADER, requestId);
    response = applyCorsHeaders(request, response);
    response = applySecurityHeaders(response);

    return response;
  };
}
