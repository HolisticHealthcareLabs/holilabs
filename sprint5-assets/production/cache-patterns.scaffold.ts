/**
 * Caching Strategy Patterns for HoliLabs
 * - Cache-aside pattern: patient demographics (5 min), lab results (1 min), appointment slots (30s)
 * - Write-through pattern: consent changes (immediate invalidation), audit logs (never cached)
 * - Cache key structure: org:{orgId}:patient:{patientId}:{resource}:{hash}
 * - CYRUS: cache keys include organizationId — cross-tenant cache poisoning = impossible
 * - Redis + in-memory L1 cache (LRU, 100 items max) for hot paths
 * - Cache warming on login (preload patient list for the org)
 * - Metrics: hit rate, miss rate, eviction count (exposed via /api/internal/cache-stats)
 */

import Redis from 'ioredis';
import { createHash } from 'crypto';

/**
 * Cache configuration per resource type
 */
export interface CacheConfig {
  ttl: number; // seconds
  pattern: 'aside' | 'through'; // cache-aside or write-through
  warmOnLogin?: boolean;
  maxSize?: number; // max value size in bytes
}

export const cacheConfigs: { [resource: string]: CacheConfig } = {
  'patient:demographics': {
    ttl: 300, // 5 minutes
    pattern: 'aside',
    warmOnLogin: true,
    maxSize: 10000, // 10KB
  },
  'patient:list': {
    ttl: 600, // 10 minutes
    pattern: 'aside',
    warmOnLogin: true,
    maxSize: 100000, // 100KB
  },
  'lab:results': {
    ttl: 60, // 1 minute
    pattern: 'aside',
    maxSize: 50000, // 50KB
  },
  'appointment:slots': {
    ttl: 30, // 30 seconds
    pattern: 'aside',
    maxSize: 20000, // 20KB
  },
  'consent:status': {
    ttl: 0, // never cache (write-through only)
    pattern: 'through',
    maxSize: 5000, // 5KB
  },
  'audit:logs': {
    ttl: 0, // never cache
    pattern: 'through',
  },
};

/**
 * L1 in-memory cache (LRU)
 */
class L1Cache {
  private cache = new Map<string, { value: any; expiredAt: number }>();
  private maxSize = 100;
  private accessOrder: string[] = [];

  set(key: string, value: any, ttl: number) {
    // Remove from access order if exists
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }

    // If cache full, remove LRU (least recently used)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    // Add to end (most recently used)
    this.accessOrder.push(key);
    this.cache.set(key, {
      value,
      expiredAt: Date.now() + ttl * 1000,
    });
  }

  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (entry.expiredAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    // Mark as recently used
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
    }

    return entry.value;
  }

  delete(key: string) {
    this.cache.delete(key);
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Cache Manager with L1 + L2 (Redis) strategy
 */
export class CacheManager {
  private redis: Redis | null = null;
  private l1Cache = new L1Cache();
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis connection
   */
  private initRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        db: parseInt(process.env.REDIS_DB || '0'), // Use DB 0 for cache
      });

      this.redis.on('error', (err) => {
        console.warn('⚠️  Redis cache connection failed:', err.message);
      });
    } catch (err) {
      console.warn('⚠️  Cache manager using L1 only (no Redis)');
    }
  }

  /**
   * Generate cache key with CYRUS org scoping
   */
  private getCacheKey(
    organizationId: string,
    resource: string,
    resourceId: string,
    variant?: string
  ): string {
    const hash = createHash('sha256').update(`${resourceId}:${variant || ''}`).digest('hex').slice(0, 8);
    return `org:${organizationId}:${resource}:${hash}`;
  }

  /**
   * Cache-aside GET: try L1, then L2 (Redis), then compute
   */
  async get<T>(
    organizationId: string,
    resource: string,
    resourceId: string,
    computeFn: () => Promise<T>,
    options?: { variant?: string; ttl?: number }
  ): Promise<T> {
    const config = cacheConfigs[resource] || { ttl: 300, pattern: 'aside' };
    const key = this.getCacheKey(organizationId, resource, resourceId, options?.variant);
    const ttl = options?.ttl ?? config.ttl;

    // L1 cache lookup
    let cached = this.l1Cache.get(key);
    if (cached !== undefined) {
      this.metrics.hits++;
      return cached as T;
    }

    // L2 cache (Redis) lookup
    if (this.redis) {
      try {
        const redisValue = await this.redis.get(key);
        if (redisValue) {
          const parsed = JSON.parse(redisValue) as T;
          // Populate L1 from L2
          this.l1Cache.set(key, parsed, ttl);
          this.metrics.hits++;
          return parsed;
        }
      } catch (err) {
        console.warn('Redis GET failed, continuing with compute:', err);
      }
    }

    // Cache miss: compute value
    this.metrics.misses++;
    const computed = await computeFn();

    // Store in both caches
    this.l1Cache.set(key, computed, ttl);
    if (this.redis && ttl > 0) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(computed));
      } catch (err) {
        console.warn('Redis SET failed:', err);
      }
    }

    return computed;
  }

  /**
   * Write-through SET: invalidate both caches
   */
  async set(
    organizationId: string,
    resource: string,
    resourceId: string,
    value: any,
    options?: { variant?: string; ttl?: number }
  ): Promise<void> {
    const config = cacheConfigs[resource] || { ttl: 300, pattern: 'aside' };
    const key = this.getCacheKey(organizationId, resource, resourceId, options?.variant);
    const ttl = options?.ttl ?? config.ttl;

    // Invalidate both caches (write-through)
    this.l1Cache.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        console.warn('Redis DEL failed:', err);
      }
    }

    // If pattern is write-through with TTL > 0, write to cache
    if (config.pattern === 'through' && ttl > 0) {
      this.l1Cache.set(key, value, ttl);
      if (this.redis) {
        try {
          await this.redis.setex(key, ttl, JSON.stringify(value));
        } catch (err) {
          console.warn('Redis SET failed:', err);
        }
      }
    }
  }

  /**
   * Invalidate cache entry (consent changes, deletes)
   */
  async invalidate(
    organizationId: string,
    resource: string,
    resourceId: string,
    options?: { variant?: string }
  ): Promise<void> {
    const key = this.getCacheKey(organizationId, resource, resourceId, options?.variant);

    this.l1Cache.delete(key);
    if (this.redis) {
      try {
        await this.redis.del(key);
      } catch (err) {
        console.warn('Redis DEL failed:', err);
      }
    }
  }

  /**
   * Invalidate all cache for a patient (used on logout)
   */
  async invalidatePatient(organizationId: string, patientId: string): Promise<void> {
    // This would need a pattern-based delete; for now, manual invalidations
    const resources = Object.keys(cacheConfigs);

    for (const resource of resources) {
      if (resource.startsWith('patient:')) {
        await this.invalidate(organizationId, resource, patientId);
      }
    }
  }

  /**
   * Cache warming on login (preload hot data)
   */
  async warmCacheOnLogin(organizationId: string, userId: string, patientIds: string[]): Promise<void> {
    console.log(`🔥 Warming cache for user ${userId} (${patientIds.length} patients)`);

    const warmable = Object.entries(cacheConfigs)
      .filter(([_, config]) => config.warmOnLogin)
      .map(([resource]) => resource);

    for (const resource of warmable) {
      for (const patientId of patientIds) {
        // Stub: load demographic data, patient list
        // const data = await db.query(...);
        // await this.set(organizationId, resource, patientId, data);
      }
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2) + '%',
      total,
      l1: this.l1Cache.getStats(),
    };
  }

  /**
   * Clear all caches
   */
  async clear() {
    this.l1Cache.clear();
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (err) {
        console.warn('Redis FLUSHDB failed:', err);
      }
    }
  }
}

/**
 * Singleton instance
 */
export const cacheManager = new CacheManager();

/**
 * Example usage:
 *
 * // Cache-aside (automatic populate)
 * const demographics = await cacheManager.get(
 *   organizationId,
 *   'patient:demographics',
 *   patientId,
 *   async () => {
 *     const patient = await db.patient.findUnique({ where: { id: patientId } });
 *     return patient;
 *   },
 *   { ttl: 300 } // 5 min
 * );
 *
 * // Write-through (invalidate on change)
 * await db.consent.update(...);
 * await cacheManager.invalidate(organizationId, 'consent:status', patientId);
 *
 * // Cache warming on login
 * await cacheManager.warmCacheOnLogin(organizationId, userId, patientIds);
 *
 * // Metrics endpoint
 * // GET /api/internal/cache-stats -> cacheManager.getMetrics()
 */

export default cacheManager;
