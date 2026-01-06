/**
 * Cache Manager
 *
 * Industry-grade caching with multiple backend support.
 * Automatically falls back to in-memory cache if Redis is unavailable.
 *
 * Features:
 * - Multi-tier caching (memory + Redis)
 * - Automatic fallback
 * - TTL support
 * - Cache warming
 * - Cache invalidation patterns
 * - Statistics tracking
 *
 * Usage:
 * ```typescript
 * const cache = getCacheManager();
 *
 * // Set cache
 * await cache.set('user:123', userData, 3600);
 *
 * // Get cache
 * const user = await cache.get('user:123');
 *
 * // Cache with function
 * const data = await cache.wrap('expensive-operation', async () => {
 *   return await expensiveQuery();
 * }, { ttl: 600 });
 * ```
 */

import { logger } from '@/lib/logger';

export interface CacheOptions {
  ttl?: number; // seconds
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

/**
 * In-memory cache implementation
 */
class MemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number; tags: string[] }>();
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 3600;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      tags: options.tags || [],
    });
    this.stats.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getByTag(tag: string): Promise<string[]> {
    const keys: string[] = [];
    this.cache.forEach((value, key) => {
      if (value.tags.includes(tag)) {
        keys.push(key);
      }
    });
    return keys;
  }

  async deleteByTag(tag: string): Promise<number> {
    const keys = await this.getByTag(tag);
    for (const key of keys) {
      await this.delete(key);
    }
    return keys.length;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }
}

/**
 * Redis cache implementation (optional)
 */
class RedisCache {
  private redis: any = null;
  private stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
        const { redis } = await import('@/lib/redis' as any);
        this.redis = redis;
        logger.info({ event: 'redis_cache_initialized' }, 'Redis cache initialized');
      }
    } catch (error) {
      logger.warn({
        event: 'redis_cache_init_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, 'Redis cache initialization failed, using memory cache');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({
        event: 'redis_get_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.stats.misses++;
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.redis) return;

    try {
      const ttl = options.ttl || 3600;
      await this.redis.set(key, JSON.stringify(value), { ex: ttl });

      // Store tags if provided
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.redis.sadd(`tag:${tag}`, key);
          await this.redis.expire(`tag:${tag}`, ttl);
        }
      }

      this.stats.sets++;
    } catch (error) {
      logger.error({
        event: 'redis_set_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const deleted = await this.redis.del(key);
      if (deleted > 0) this.stats.deletes++;
      return deleted > 0;
    } catch (error) {
      logger.error({
        event: 'redis_delete_error',
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.flushdb();
    } catch (error) {
      logger.error({
        event: 'redis_clear_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getByTag(tag: string): Promise<string[]> {
    if (!this.redis) return [];

    try {
      const keys = await this.redis.smembers(`tag:${tag}`);
      return keys || [];
    } catch (error) {
      return [];
    }
  }

  async deleteByTag(tag: string): Promise<number> {
    const keys = await this.getByTag(tag);
    let deleted = 0;

    for (const key of keys) {
      const result = await this.delete(key);
      if (result) deleted++;
    }

    if (this.redis) {
      await this.redis.del(`tag:${tag}`);
    }

    return deleted;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }
}

/**
 * Cache Manager - combines memory and Redis caching
 */
export class CacheManager {
  private memoryCache = new MemoryCache();
  private redisCache = new RedisCache();

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memValue = await this.memoryCache.get<T>(key);
    if (memValue !== null) return memValue;

    // Try Redis cache
    const redisValue = await this.redisCache.get<T>(key);
    if (redisValue !== null) {
      // Populate memory cache
      await this.memoryCache.set(key, redisValue, { ttl: 300 });
      return redisValue;
    }

    return null;
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    await Promise.all([
      this.memoryCache.set(key, value, options),
      this.redisCache.set(key, value, options),
    ]);
  }

  async delete(key: string): Promise<boolean> {
    const [memDeleted, redisDeleted] = await Promise.all([
      this.memoryCache.delete(key),
      this.redisCache.delete(key),
    ]);
    return memDeleted || redisDeleted;
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.redisCache.clear(),
    ]);
  }

  async deleteByTag(tag: string): Promise<number> {
    const [memDeleted, redisDeleted] = await Promise.all([
      this.memoryCache.deleteByTag(tag),
      this.redisCache.deleteByTag(tag),
    ]);
    return Math.max(memDeleted, redisDeleted);
  }

  /**
   * Wrap a function with caching
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }

  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      redis: this.redisCache.getStats(),
    };
  }
}

// Global cache manager instance
let cacheManager: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

/**
 * Cache key builders for consistency
 */
export const cacheKeys = {
  patient: (id: string) => `patient:${id}`,
  patientList: (clinicianId: string, page: number) => `patients:${clinicianId}:${page}`,
  consultation: (id: string) => `consultation:${id}`,
  labResult: (id: string) => `lab-result:${id}`,
  prescription: (id: string) => `prescription:${id}`,
};

/**
 * Cache tags for batch invalidation
 */
export const cacheTags = {
  patients: 'patients',
  consultations: 'consultations',
  labResults: 'lab-results',
  prescriptions: 'prescriptions',
};
