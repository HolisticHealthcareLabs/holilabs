import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

let redis: Redis | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const rateLimitStore = new Map<string, number>();

setInterval(() => {
  if (redis) return;
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, resetAt] of entries) {
    if (now > resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export async function checkImportRateLimit(organizationId: string): Promise<{ allowed: boolean; resetAt?: Date }> {
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const key = `import_ratelimit:org:${organizationId}`;
  const now = Date.now();
  const resetAtTime = now + WINDOW_MS;

  if (redis) {
    try {
      const current = await redis.get(key);
      if (current) {
        const ttl = await redis.pttl(key);
        return { allowed: false, resetAt: new Date(now + (ttl > 0 ? ttl : WINDOW_MS)) };
      }
      await redis.set(key, '1', { px: WINDOW_MS });
      return { allowed: true };
    } catch (error) {
      logger.error({ event: 'import_rate_limit_redis_error', organizationId, error });
    }
  }

  // In-memory fallback
  const existingResetAt = rateLimitStore.get(key);
  if (existingResetAt && now < existingResetAt) {
    return { allowed: false, resetAt: new Date(existingResetAt) };
  }

  rateLimitStore.set(key, resetAtTime);
  return { allowed: true };
}
