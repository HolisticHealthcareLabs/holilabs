/**
 * Redis-backed Rate Limiter Middleware
 * - Sliding window algorithm (not fixed window — prevents burst at boundary)
 * - Tiers: public (60/min), authenticated (120/min), api_key (600/min), webhook (30/min)
 * - Per-route overrides: /api/auth/* (20/min brute force), /api/portal/export (3/hour expensive)
 * - Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
 * - 429 response with Retry-After header
 * - CYRUS: rate limit bypass for internal health checks (via shared secret header)
 * - Redis connection pool with graceful fallback to in-memory if unavailable
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

/**
 * Rate limit tier configuration
 */
interface RateLimitTier {
  name: string;
  limit: number; // requests
  window: number; // seconds
  description: string;
}

interface RateLimitConfig {
  [tier: string]: RateLimitTier;
}

/**
 * Per-route overrides
 */
interface RouteOverride {
  pattern: RegExp;
  tier: string;
  limit: number;
  window: number;
  description: string;
}

const config: RateLimitConfig = {
  public: {
    name: 'Public',
    limit: 60,
    window: 60,
    description: 'Unauthenticated requests',
  },
  authenticated: {
    name: 'Authenticated',
    limit: 120,
    window: 60,
    description: 'Logged-in users',
  },
  api_key: {
    name: 'API Key',
    limit: 600,
    window: 60,
    description: 'API key holders',
  },
  webhook: {
    name: 'Webhook',
    limit: 30,
    window: 60,
    description: 'Webhook endpoints',
  },
};

/**
 * Route-specific overrides (checked first)
 */
const routeOverrides: RouteOverride[] = [
  {
    pattern: /^\/api\/auth\//,
    tier: 'public',
    limit: 20,
    window: 60,
    description: 'Brute force protection: login, signup, password reset',
  },
  {
    pattern: /^\/api\/portal\/export/,
    tier: 'authenticated',
    limit: 3,
    window: 3600, // 1 hour
    description: 'Expensive operation: RIPS/invoice export',
  },
  {
    pattern: /^\/api\/clinical\/bulk-import/,
    tier: 'authenticated',
    limit: 1,
    window: 3600,
    description: 'Bulk operations: patient batch import',
  },
];

/**
 * In-memory fallback cache (LRU)
 */
class InMemoryRateLimitStore {
  private cache = new Map<string, { count: number; resetAt: number }>();
  private maxSize = 10000;

  set(key: string, count: number, resetAt: number) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { count, resetAt });
  }

  get(key: string): { count: number; resetAt: number } | undefined {
    const entry = this.cache.get(key);
    if (entry && entry.resetAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }

  increment(key: string, resetAt: number): number {
    const entry = this.get(key);
    if (!entry) {
      this.set(key, 1, resetAt);
      return 1;
    }
    entry.count++;
    return entry.count;
  }
}

/**
 * Rate Limiter class
 */
export class RateLimiter {
  private redis: Redis | null = null;
  private fallback = new InMemoryRateLimitStore();
  private useInMemory = false;

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis connection with fallback
   */
  private initRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_DB || '1'), // Use DB 1 for rate limiting
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.redis.on('error', (err) => {
        console.warn('❌ Redis connection failed, falling back to in-memory:', err.message);
        this.useInMemory = true;
      });

      this.redis.on('connect', () => {
        console.log('✅ Rate limiter connected to Redis');
        this.useInMemory = false;
      });
    } catch (err) {
      console.warn('⚠️  Rate limiter using in-memory store');
      this.useInMemory = true;
    }
  }

  /**
   * Determine which tier applies to this request
   */
  private getTier(req: NextRequest, userId?: string): { tier: string; limit: number; window: number } {
    const pathname = new URL(req.url).pathname;

    // Check route overrides first
    for (const override of routeOverrides) {
      if (override.pattern.test(pathname)) {
        return {
          tier: override.tier,
          limit: override.limit,
          window: override.window,
        };
      }
    }

    // Check tier from request
    const apiKey = req.headers.get('X-API-Key');
    if (apiKey) {
      return { tier: 'api_key', limit: config.api_key.limit, window: config.api_key.window };
    }

    if (userId) {
      return { tier: 'authenticated', limit: config.authenticated.limit, window: config.authenticated.window };
    }

    return { tier: 'public', limit: config.public.limit, window: config.public.window };
  }

  /**
   * Generate rate limit key
   */
  private getKey(req: NextRequest, userId?: string): string {
    const ip = req.headers.get('X-Forwarded-For') || req.headers.get('X-Real-IP') || 'unknown';
    return userId ? `ratelimit:user:${userId}` : `ratelimit:ip:${ip}`;
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkLimit(req: NextRequest, userId?: string): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    // CYRUS: bypass rate limit for internal health checks
    const healthCheckSecret = req.headers.get('X-Health-Check-Secret');
    if (healthCheckSecret === process.env.HEALTH_CHECK_SECRET) {
      return {
        allowed: true,
        limit: 999999,
        remaining: 999999,
        resetAt: Date.now() + 60000,
      };
    }

    const { tier, limit, window } = this.getTier(req, userId);
    const key = this.getKey(req, userId);
    const now = Date.now();
    const windowStart = now - window * 1000;

    try {
      if (this.useInMemory || !this.redis) {
        return this.checkLimitInMemory(key, limit, window, windowStart);
      }

      return await this.checkLimitRedis(key, limit, window, windowStart);
    } catch (err) {
      console.error('Rate limit check failed, falling back to in-memory:', err);
      return this.checkLimitInMemory(key, limit, window, windowStart);
    }
  }

  /**
   * Check limit in Redis using sliding window
   */
  private async checkLimitRedis(
    key: string,
    limit: number,
    window: number,
    windowStart: number
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    const pipeline = this.redis!.pipeline();

    // Remove old entries outside window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, Date.now(), `${Date.now()}-${Math.random()}`);

    // Set expiry (window + 1 second buffer)
    pipeline.expire(key, window + 1);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Pipeline execution failed');
    }

    const count = (results[1][1] as number) + 1; // +1 for the request we just added
    const resetAt = Date.now() + window * 1000;
    const allowed = count <= limit;

    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - Date.now()) / 1000),
    };
  }

  /**
   * Check limit in-memory (fallback)
   */
  private checkLimitInMemory(
    key: string,
    limit: number,
    window: number,
    windowStart: number
  ): {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const resetAt = Date.now() + window * 1000;
    const entry = this.fallback.get(key);

    if (!entry) {
      this.fallback.set(key, 1, resetAt);
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetAt,
      };
    }

    const count = entry.count + 1;
    this.fallback.increment(key, resetAt);

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfter: count > limit ? Math.ceil((resetAt - Date.now()) / 1000) : undefined,
    };
  }
}

/**
 * Next.js middleware for rate limiting
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const limiter = new RateLimiter();
  const result = await limiter.checkLimit(req, userId);

  // Add rate limit headers to response
  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };

  if (!result.allowed) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': result.retryAfter?.toString() || '60',
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Request allowed; headers will be added to response via next.js response
  return null;
}

/**
 * Example usage in API route handler:
 *
 * export async function POST(req: NextRequest) {
 *   const user = await getUser(req); // from JWT
 *   const rateLimitError = await rateLimitMiddleware(req, user?.id);
 *
 *   if (rateLimitError) {
 *     return rateLimitError;
 *   }
 *
 *   // Continue with request logic
 *   return NextResponse.json({ status: 'ok' });
 * }
 */

export default RateLimiter;
