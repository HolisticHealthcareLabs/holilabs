/**
 * Multi-Window Rate Limiting for Exports
 *
 * Enforces cascading rate limits for data exports:
 * - 3 exports per hour
 * - 5 exports per day
 * - 20 exports per month
 *
 * @compliance HIPAA §164.502(b) - Minimum Necessary
 * @compliance LGPD Art. 15 - Data Minimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { ApiContext, Middleware } from './middleware';
import { logger } from '@/lib/logger';

// Initialize Redis client (only if credentials are available)
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

// In-memory fallback for development
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

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
}, 60000); // Cleanup every minute

interface ExportRateLimitResult {
  allowed: boolean;
  hourlyRemaining: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  resetAt: {
    hourly: number;
    daily: number;
    monthly: number;
  };
  violatedLimit?: 'hourly' | 'daily' | 'monthly';
}

/**
 * Check multi-window export rate limits
 * Returns comprehensive rate limit status across all time windows
 */
export async function checkExportRateLimit(
  userId: string,
  context: ApiContext
): Promise<ExportRateLimitResult> {
  const now = Date.now();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const hourKey = `export_ratelimit:${userId}:hour:${hourStart.getTime()}`;
  const dayKey = `export_ratelimit:${userId}:day:${dayStart.getTime()}`;
  const monthKey = `export_ratelimit:${userId}:month:${monthStart.getTime()}`;

  // Rate limit thresholds
  const HOURLY_LIMIT = 3;
  const DAILY_LIMIT = 5;
  const MONTHLY_LIMIT = 20;

  // Calculate reset times
  const hourReset = new Date(hourStart.getTime() + 60 * 60 * 1000);
  const dayReset = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const monthReset = new Date(monthStart);
  monthReset.setMonth(monthReset.getMonth() + 1);

  let hourlyCount = 0;
  let dailyCount = 0;
  let monthlyCount = 0;

  // ========================================================================
  // REDIS IMPLEMENTATION (Production)
  // ========================================================================
  if (redis) {
    try {
      // Get current counts
      const [hourlyResult, dailyResult, monthlyResult] = await Promise.all([
        redis.get(hourKey),
        redis.get(dayKey),
        redis.get(monthKey),
      ]);

      hourlyCount = typeof hourlyResult === 'number' ? hourlyResult : 0;
      dailyCount = typeof dailyResult === 'number' ? dailyResult : 0;
      monthlyCount = typeof monthlyResult === 'number' ? monthlyResult : 0;

      logger.debug({
        event: 'export_rate_limit_check',
        userId,
        hourlyCount,
        dailyCount,
        monthlyCount,
        backend: 'redis',
      });

      // Check limits
      if (hourlyCount >= HOURLY_LIMIT) {
        logger.warn({
          event: 'export_rate_limit_exceeded',
          userId,
          limit: 'hourly',
          count: hourlyCount,
          max: HOURLY_LIMIT,
          resetAt: hourReset.toISOString(),
        });

        return {
          allowed: false,
          hourlyRemaining: 0,
          dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount),
          monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount),
          resetAt: {
            hourly: hourReset.getTime(),
            daily: dayReset.getTime(),
            monthly: monthReset.getTime(),
          },
          violatedLimit: 'hourly',
        };
      }

      if (dailyCount >= DAILY_LIMIT) {
        logger.warn({
          event: 'export_rate_limit_exceeded',
          userId,
          limit: 'daily',
          count: dailyCount,
          max: DAILY_LIMIT,
          resetAt: dayReset.toISOString(),
        });

        return {
          allowed: false,
          hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount),
          dailyRemaining: 0,
          monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount),
          resetAt: {
            hourly: hourReset.getTime(),
            daily: dayReset.getTime(),
            monthly: monthReset.getTime(),
          },
          violatedLimit: 'daily',
        };
      }

      if (monthlyCount >= MONTHLY_LIMIT) {
        logger.warn({
          event: 'export_rate_limit_exceeded',
          userId,
          limit: 'monthly',
          count: monthlyCount,
          max: MONTHLY_LIMIT,
          resetAt: monthReset.toISOString(),
        });

        return {
          allowed: false,
          hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount),
          dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount),
          monthlyRemaining: 0,
          resetAt: {
            hourly: hourReset.getTime(),
            daily: dayReset.getTime(),
            monthly: monthReset.getTime(),
          },
          violatedLimit: 'monthly',
        };
      }

      // Increment counts (allowed)
      await Promise.all([
        redis.incr(hourKey),
        redis.incr(dayKey),
        redis.incr(monthKey),
      ]);

      // Set expiration if this is the first increment
      const hourTTL = Math.ceil((hourReset.getTime() - now) / 1000);
      const dayTTL = Math.ceil((dayReset.getTime() - now) / 1000);
      const monthTTL = Math.ceil((monthReset.getTime() - now) / 1000);

      await Promise.all([
        redis.expire(hourKey, hourTTL),
        redis.expire(dayKey, dayTTL),
        redis.expire(monthKey, monthTTL),
      ]);

      logger.info({
        event: 'export_allowed',
        userId,
        hourlyCount: hourlyCount + 1,
        dailyCount: dailyCount + 1,
        monthlyCount: monthlyCount + 1,
        backend: 'redis',
      });

      return {
        allowed: true,
        hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount - 1),
        dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount - 1),
        monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount - 1),
        resetAt: {
          hourly: hourReset.getTime(),
          daily: dayReset.getTime(),
          monthly: monthReset.getTime(),
        },
      };
    } catch (error) {
      logger.error({
        event: 'export_rate_limit_redis_error',
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fall through to in-memory implementation
    }
  }

  // ========================================================================
  // IN-MEMORY FALLBACK (Development or Redis failure)
  // ========================================================================

  const hourRecord = rateLimitStore.get(hourKey);
  const dayRecord = rateLimitStore.get(dayKey);
  const monthRecord = rateLimitStore.get(monthKey);

  hourlyCount = hourRecord?.count ?? 0;
  dailyCount = dayRecord?.count ?? 0;
  monthlyCount = monthRecord?.count ?? 0;

  // Check limits
  if (hourlyCount >= HOURLY_LIMIT) {
    return {
      allowed: false,
      hourlyRemaining: 0,
      dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount),
      monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount),
      resetAt: {
        hourly: hourReset.getTime(),
        daily: dayReset.getTime(),
        monthly: monthReset.getTime(),
      },
      violatedLimit: 'hourly',
    };
  }

  if (dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount),
      dailyRemaining: 0,
      monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount),
      resetAt: {
        hourly: hourReset.getTime(),
        daily: dayReset.getTime(),
        monthly: monthReset.getTime(),
      },
      violatedLimit: 'daily',
    };
  }

  if (monthlyCount >= MONTHLY_LIMIT) {
    return {
      allowed: false,
      hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount),
      dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount),
      monthlyRemaining: 0,
      resetAt: {
        hourly: hourReset.getTime(),
        daily: dayReset.getTime(),
        monthly: monthReset.getTime(),
      },
      violatedLimit: 'monthly',
    };
  }

  // Increment counts
  rateLimitStore.set(hourKey, { count: hourlyCount + 1, resetAt: hourReset.getTime() });
  rateLimitStore.set(dayKey, { count: dailyCount + 1, resetAt: dayReset.getTime() });
  rateLimitStore.set(monthKey, { count: monthlyCount + 1, resetAt: monthReset.getTime() });

  logger.info({
    event: 'export_allowed',
    userId,
    hourlyCount: hourlyCount + 1,
    dailyCount: dailyCount + 1,
    monthlyCount: monthlyCount + 1,
    backend: 'in-memory',
  });

  return {
    allowed: true,
    hourlyRemaining: Math.max(0, HOURLY_LIMIT - hourlyCount - 1),
    dailyRemaining: Math.max(0, DAILY_LIMIT - dailyCount - 1),
    monthlyRemaining: Math.max(0, MONTHLY_LIMIT - monthlyCount - 1),
    resetAt: {
      hourly: hourReset.getTime(),
      daily: dayReset.getTime(),
      monthly: monthReset.getTime(),
    },
  };
}

/**
 * Middleware function for export rate limiting
 * Use this in createProtectedRoute instead of standard rateLimit
 */
export function exportRateLimit() {
  return async (
    request: NextRequest,
    context: ApiContext,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    if (!context.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const result = await checkExportRateLimit(context.user.id, context);

    if (!result.allowed) {
      const resetDate = new Date(result.resetAt[result.violatedLimit!]);
      const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

      let message = '';
      switch (result.violatedLimit) {
        case 'hourly':
          message = `You have reached the hourly export limit (3 per hour). Please try again after ${resetDate.toLocaleTimeString()}.`;
          break;
        case 'daily':
          message = `You have reached the daily export limit (5 per day). Please try again tomorrow.`;
          break;
        case 'monthly':
          message = `You have reached the monthly export limit (20 per month). Please try again next month.`;
          break;
      }

      return NextResponse.json(
        {
          success: false,
          error: 'EXPORT_RATE_LIMIT_EXCEEDED',
          message,
          limits: {
            hourly: { remaining: result.hourlyRemaining, limit: 3 },
            daily: { remaining: result.dailyRemaining, limit: 5 },
            monthly: { remaining: result.monthlyRemaining, limit: 20 },
          },
          resetAt: {
            hourly: new Date(result.resetAt.hourly).toISOString(),
            daily: new Date(result.resetAt.daily).toISOString(),
            monthly: new Date(result.resetAt.monthly).toISOString(),
          },
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Hourly-Limit': '3',
            'X-RateLimit-Hourly-Remaining': result.hourlyRemaining.toString(),
            'X-RateLimit-Daily-Limit': '5',
            'X-RateLimit-Daily-Remaining': result.dailyRemaining.toString(),
            'X-RateLimit-Monthly-Limit': '20',
            'X-RateLimit-Monthly-Remaining': result.monthlyRemaining.toString(),
          },
        }
      );
    }

    // Export allowed - add rate limit headers to response
    const response = await next();

    response.headers.set('X-RateLimit-Hourly-Limit', '3');
    response.headers.set('X-RateLimit-Hourly-Remaining', result.hourlyRemaining.toString());
    response.headers.set('X-RateLimit-Daily-Limit', '5');
    response.headers.set('X-RateLimit-Daily-Remaining', result.dailyRemaining.toString());
    response.headers.set('X-RateLimit-Monthly-Limit', '20');
    response.headers.set('X-RateLimit-Monthly-Remaining', result.monthlyRemaining.toString());

    return response;
  };
}
