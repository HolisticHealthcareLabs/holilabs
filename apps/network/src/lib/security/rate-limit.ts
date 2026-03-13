/**
 * In-process sliding-window rate limiter for @holi/network.
 *
 * Uses a Map-based token bucket. For multi-instance production deployments,
 * swap this for Upstash Redis (@upstash/ratelimit) by setting UPSTASH_REDIS_URL.
 *
 * Default limit: 20 requests per orgId per 60 seconds on referral creation.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    windows.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}

// Prune stale entries every 5 minutes to prevent unbounded growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    Array.from(windows.entries()).forEach(([key, win]) => {
      if (now >= win.resetAt) windows.delete(key);
    });
  }, 5 * 60_000);
}
