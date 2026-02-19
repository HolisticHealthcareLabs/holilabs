/**
 * Enterprise API Rate Limiter — Blue Ocean Phase 3
 *
 * Sliding window rate limiter for enterprise endpoints.
 * In-memory for development/single-instance; production would use Redis (Upstash).
 *
 * Default limits:
 *   - Single assessment: 60 requests/minute per key
 *   - Bulk assessment:   10 requests/minute per key
 */

import { NextResponse } from 'next/server';

interface RateLimitWindow {
  timestamps: number[];
}

const store = new Map<string, RateLimitWindow>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  for (const [key, window] of store) {
    window.timestamps = window.timestamps.filter((t) => t > cutoff);
    if (window.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitConfig {
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in current window. */
  remaining: number;
  /** When the window resets (epoch ms). */
  resetAt: number;
  /** Pre-built 429 response if rate-limited. */
  response?: NextResponse;
}

/** Default: 60 requests per 60 seconds */
export const SINGLE_ASSESSMENT_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

/** Default: 10 bulk requests per 60 seconds */
export const BULK_ASSESSMENT_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

/**
 * Check if a request is within the rate limit.
 *
 * @param identifier - Unique key for rate limiting (e.g., API key hash or IP)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with `allowed` flag and metadata
 *
 * Usage:
 * ```ts
 * const limit = checkRateLimit(apiKeyHash, BULK_ASSESSMENT_LIMIT);
 * if (!limit.allowed) return limit.response;
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  cleanup(config.windowMs);

  let window = store.get(identifier);
  if (!window) {
    window = { timestamps: [] };
    store.set(identifier, window);
  }

  // Slide: remove timestamps outside the window
  window.timestamps = window.timestamps.filter((t) => t > cutoff);

  if (window.timestamps.length >= config.maxRequests) {
    const oldestInWindow = window.timestamps[0];
    const resetAt = oldestInWindow + config.windowMs;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      response: NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000}s.`,
          retryAfterMs: resetAt - now,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          },
        },
      ),
    };
  }

  // Record this request
  window.timestamps.push(now);

  const remaining = config.maxRequests - window.timestamps.length;
  const resetAt = now + config.windowMs;

  return { allowed: true, remaining, resetAt };
}

/**
 * Reset rate limit state for a given identifier.
 * Useful for testing.
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Clear all rate limit state.
 * Useful for testing.
 */
export function clearAllRateLimits(): void {
  store.clear();
}
