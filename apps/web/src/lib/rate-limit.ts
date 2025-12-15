/**
 * Rate Limiting Utility
 *
 * Protects API endpoints from abuse using Upstash Redis
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import logger from './logger';

// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimiters = {
  // Authentication endpoints - 5 requests per 15 minutes (stricter for signin)
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: '@ratelimit/auth',
      })
    : null,

  // Registration endpoints - 3 requests per hour (prevent abuse)
  registration: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: true,
        prefix: '@ratelimit/registration',
      })
    : null,

  // Password reset endpoints - 3 requests per hour (prevent enumeration)
  passwordReset: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        analytics: true,
        prefix: '@ratelimit/password-reset',
      })
    : null,

  // File upload endpoints - 10 uploads per minute
  upload: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: '@ratelimit/upload',
      })
    : null,

  // Message sending - 30 messages per minute
  messages: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: '@ratelimit/messages',
      })
    : null,

  // General API endpoints - 100 requests per minute
  api: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
        prefix: '@ratelimit/api',
      })
    : null,

  // Search endpoints - 20 requests per minute
  search: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: '@ratelimit/search',
      })
    : null,

  // Appointment endpoints - 60 requests per minute
  appointments: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: '@ratelimit/appointments',
      })
    : null,
};

/**
 * Get identifier from request (IP address or user ID)
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  // Prefer userId for authenticated requests
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'anonymous';

  return `ip:${ip}`;
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: NextRequest,
  limiterType: keyof typeof rateLimiters,
  userId?: string
): Promise<{ success: boolean; response?: NextResponse }> {
  const limiter = rateLimiters[limiterType];

  // If Redis is not configured, allow all requests (dev mode)
  if (!limiter) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug({
        event: 'rate_limit_disabled',
        limiterType,
        message: 'Rate limiting is disabled (Redis not configured)',
      });
      return { success: true };
    } else {
      logger.warn({
        event: 'rate_limit_not_configured',
        limiterType,
        message: 'Rate limiting is not configured in production!',
      });
      return { success: true };
    }
  }

  try {
    const identifier = getIdentifier(request, userId);

    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    if (!success) {
      logger.warn({
        event: 'rate_limit_exceeded',
        limiterType,
        identifier,
        limit,
        reset,
        remaining,
      });

      const resetDate = new Date(reset);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      return {
        success: false,
        response: NextResponse.json(
          {
            success: false,
            error: 'Too many requests. Please try again later.',
            details: {
              limit,
              remaining: 0,
              reset: resetDate.toISOString(),
              retryAfter,
            },
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        ),
      };
    }

    logger.debug({
      event: 'rate_limit_ok',
      limiterType,
      identifier,
      remaining,
      limit,
    });

    return { success: true };
  } catch (error) {
    logger.error({
      event: 'rate_limit_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      limiterType,
    });

    // On error, allow the request to proceed (fail open)
    return { success: true };
  }
}

/**
 * Rate limit middleware for API routes
 * Usage: export const middleware = withRateLimit('api');
 */
export function withRateLimit(limiterType: keyof typeof rateLimiters) {
  return async (request: NextRequest) => {
    // Get userId from session if available (simplified)
    const userId = request.headers.get('x-user-id') || undefined;

    const result = await applyRateLimit(request, limiterType, userId);

    if (!result.success && result.response) {
      return result.response;
    }

    // Continue to next middleware/handler
    return NextResponse.next();
  };
}

/**
 * Manual rate limit check for use in API route handlers
 */
export async function checkRateLimit(
  request: NextRequest,
  limiterType: keyof typeof rateLimiters,
  userId?: string
): Promise<NextResponse | null> {
  const result = await applyRateLimit(request, limiterType, userId);

  if (!result.success && result.response) {
    return result.response;
  }

  return null;
}
