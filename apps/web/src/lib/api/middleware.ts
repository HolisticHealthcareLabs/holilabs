/**
 * API Middleware Utilities
 * Industry-grade request handling, validation, and security
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// ============================================================================
// TYPES
// ============================================================================

export type ApiHandler = (
  request: NextRequest,
  context: ApiContext
) => Promise<NextResponse> | NextResponse;

export interface ApiContext {
  params?: Record<string, string>;
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
// RATE LIMITING (In-memory for now, use Redis in production)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => {
    const identifier = request.headers.get('x-forwarded-for') || 'unknown';
    const key = `${identifier}:${request.url}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    // Clean up expired records
    if (record && now > record.resetAt) {
      rateLimitStore.delete(key);
    }

    const current = rateLimitStore.get(key);

    if (!current) {
      // First request in window
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return next();
    }

    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetAt - now) / 1000);
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

    // Increment count
    current.count++;
    rateLimitStore.set(key, current);

    const response = await next();

    // Add rate limit headers
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
      const supabase = await createServerClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return NextResponse.json(
          { error: 'Unauthorized - Please login' },
          { status: 401 }
        );
      }

      // Fetch user from database with role
      const dbUser = await prisma.user.findUnique({
        where: { supabaseId: user.id },
        select: { id: true, email: true, role: true },
      });

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found in database' },
          { status: 404 }
        );
      }

      // Attach user to context
      context.user = {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      };

      return next();
    } catch (error) {
      console.error('Auth middleware error:', error);
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

export type UserRole = 'ADMIN' | 'CLINICIAN' | 'NURSE' | 'STAFF';

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
    try {
      return await handler(request, context);
    } catch (error: any) {
      console.error('API Error:', error);

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
      try {
        await prisma.auditLog.create({
          data: {
            userId: context.user?.id,
            userEmail: context.user?.email || 'anonymous',
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            action,
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
      } catch (error) {
        console.error('Audit log error:', error);
      }
    })();

    return response;
  };
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Create a protected API route with authentication, rate limiting, and error handling
 */
export function createProtectedRoute(
  handler: ApiHandler,
  options?: {
    roles?: UserRole[];
    rateLimit?: RateLimitConfig;
    audit?: { action: string; resource: string };
  }
) {
  const middlewares: Middleware[] = [requireAuth()];

  if (options?.rateLimit) {
    middlewares.push(rateLimit(options.rateLimit));
  }

  if (options?.roles) {
    middlewares.push(requireRole(...options.roles));
  }

  if (options?.audit) {
    middlewares.push(withAuditLog(options.audit.action, options.audit.resource));
  }

  return withErrorHandling(compose(...middlewares)(handler));
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
  const middlewares: Middleware[] = [];

  if (options?.rateLimit) {
    middlewares.push(rateLimit(options.rateLimit));
  }

  return withErrorHandling(compose(...middlewares)(handler));
}
