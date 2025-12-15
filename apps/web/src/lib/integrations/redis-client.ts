/**
 * Redis Client for Caching
 *
 * Upstash Redis client for distributed caching
 * Used for drug interaction API responses
 *
 * @module integrations/redis-client
 */

import { Redis } from '@upstash/redis';

/**
 * Redis client singleton
 */
let redisClient: Redis | null = null;

/**
 * Get Redis client instance
 * Falls back to in-memory cache if Redis is not configured
 */
export function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('[Redis] Redis credentials not configured. Using in-memory cache fallback.');
    return null;
  }

  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('[Redis] Connected to Upstash Redis');
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to connect to Redis:', error);
    return null;
  }
}

/**
 * In-memory cache fallback
 */
class InMemoryCache {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();

  async get<T = any>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const expiresAt = options?.ex
      ? Date.now() + options.ex * 1000
      : Date.now() + 3600 * 1000; // Default 1 hour

    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

const inMemoryCache = new InMemoryCache();

// Cleanup in-memory cache every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => inMemoryCache.cleanup(), 5 * 60 * 1000);
}

/**
 * Cache interface with automatic fallback
 */
export class CacheClient {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get<T>(key);
        return value;
      }
      return await inMemoryCache.get<T>(key);
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return await inMemoryCache.get<T>(key);
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      if (this.redis) {
        if (ttlSeconds) {
          await this.redis.set(key, value, { ex: ttlSeconds });
        } else {
          await this.redis.set(key, value);
        }
      } else {
        await inMemoryCache.set(key, value, { ex: ttlSeconds });
      }
    } catch (error) {
      console.error('[Cache] Set error:', error);
      await inMemoryCache.set(key, value, { ex: ttlSeconds });
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      await inMemoryCache.del(key);
    } catch (error) {
      console.error('[Cache] Delete error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key);
        return result > 0;
      }
      const value = await inMemoryCache.get(key);
      return value !== null;
    } catch (error) {
      console.error('[Cache] Exists error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheClient = new CacheClient();
