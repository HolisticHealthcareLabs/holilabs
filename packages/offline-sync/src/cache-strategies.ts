/**
 * Clinical Cache Strategies
 * Implements Workbox-inspired caching with clinical-aware freshness rules
 *
 * Safety Invariants:
 * - CYRUS: All cache keys include tenantId for cross-tenant isolation
 * - RUTH: Stale data includes recency indicator
 */

import {
  ClinicalCacheRule,
  CacheEntryMetadata,
  ClinicalResourceType,
  CacheStrategy,
  ICacheManager,
  IStorageBackend,
} from './types';

/**
 * In-memory storage backend for testing
 * In production, this would use browser Cache API or IndexedDB
 */
export class InMemoryStorageBackend implements IStorageBackend {
  private store = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async keys(pattern?: string): Promise<string[]> {
    if (!pattern) return Array.from(this.store.keys());

    const regex = new RegExp(pattern);
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * ClinicalCacheManager
 * Manages caching of clinical data with different strategies per resource type
 */
export class ClinicalCacheManager implements ICacheManager {
  private rules: Map<ClinicalResourceType, ClinicalCacheRule>;
  private storage: IStorageBackend;

  constructor(storage?: IStorageBackend) {
    this.storage = storage || new InMemoryStorageBackend();
    this.rules = new Map();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default clinical caching rules
   * Based on clinical requirements and data sensitivity
   */
  private initializeDefaultRules(): void {
    // Patient demographics: relatively static, safe to cache long
    this.addRule({
      resourceType: 'patient-demographics',
      strategy: 'CACHE_FIRST',
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
      staleWarningMs: 12 * 60 * 60 * 1000, // 12 hours
      tenantScoped: true,
      offlineWritable: false,
    });

    // Active medications: CRITICAL safety data, must be fresh
    this.addRule({
      resourceType: 'active-medications',
      strategy: 'NETWORK_FIRST',
      maxAgeMs: 15 * 60 * 1000, // 15 minutes
      staleWarningMs: 5 * 60 * 1000, // 5 minutes
      tenantScoped: true,
      offlineWritable: false,
    });

    // Lab results: authoritative once available, can cache
    this.addRule({
      resourceType: 'lab-results',
      strategy: 'STALE_WHILE_REVALIDATE',
      maxAgeMs: 4 * 60 * 60 * 1000, // 4 hours
      staleWarningMs: 1 * 60 * 60 * 1000, // 1 hour
      tenantScoped: true,
      offlineWritable: false,
    });

    // Vital signs: updated frequently, cache for quick access but stay fresh
    this.addRule({
      resourceType: 'vital-signs',
      strategy: 'STALE_WHILE_REVALIDATE',
      maxAgeMs: 30 * 60 * 1000, // 30 minutes
      staleWarningMs: 10 * 60 * 1000, // 10 minutes
      tenantScoped: true,
      offlineWritable: true,
    });

    // Prevention alerts: important safety info, must be current
    this.addRule({
      resourceType: 'prevention-alerts',
      strategy: 'NETWORK_FIRST',
      maxAgeMs: 60 * 60 * 1000, // 1 hour
      staleWarningMs: 30 * 60 * 1000, // 30 minutes
      tenantScoped: true,
      offlineWritable: false,
    });

    // Reference data: ICD-10, drug formulary, etc. - very stable
    this.addRule({
      resourceType: 'reference-data',
      strategy: 'CACHE_FIRST',
      maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      staleWarningMs: 3 * 24 * 60 * 60 * 1000, // 3 days
      tenantScoped: true,
      offlineWritable: false,
    });

    // Imaging metadata: stable once computed
    this.addRule({
      resourceType: 'imaging-metadata',
      strategy: 'CACHE_FIRST',
      maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
      staleWarningMs: 12 * 60 * 60 * 1000, // 12 hours
      tenantScoped: true,
      offlineWritable: false,
    });

    // Encounter being currently worked on: must be fresh
    this.addRule({
      resourceType: 'encounter-active',
      strategy: 'NETWORK_FIRST',
      maxAgeMs: 5 * 60 * 1000, // 5 minutes
      staleWarningMs: 2 * 60 * 1000, // 2 minutes
      tenantScoped: true,
      offlineWritable: true,
    });

    // Clinical notes: handled carefully, no auto-merge
    this.addRule({
      resourceType: 'clinical-notes',
      strategy: 'NETWORK_FIRST',
      maxAgeMs: 30 * 60 * 1000, // 30 minutes
      staleWarningMs: 10 * 60 * 1000, // 10 minutes
      tenantScoped: true,
      offlineWritable: true,
    });
  }

  /**
   * Add or update a caching rule
   */
  addRule(rule: ClinicalCacheRule): void {
    // CYRUS: All clinical data must be tenant-scoped
    if (!rule.tenantScoped) {
      throw new Error(`Rule for ${rule.resourceType} must have tenantScoped=true`);
    }
    this.rules.set(rule.resourceType, rule);
  }

  /**
   * Get the rule for a resource type
   */
  getRule(resourceType: ClinicalResourceType): ClinicalCacheRule | null {
    return this.rules.get(resourceType) ?? null;
  }

  /**
   * Generate cache key with tenant isolation (CYRUS)
   */
  private generateCacheKey(resourceKey: string, tenantId: string): string {
    return `cache:${tenantId}:${resourceKey}`;
  }

  /**
   * Generate metadata key
   */
  private generateMetadataKey(resourceKey: string, tenantId: string): string {
    return `meta:${tenantId}:${resourceKey}`;
  }

  /**
   * Retrieve data from cache with freshness check
   */
  async get(key: string, tenantId: string): Promise<unknown | null> {
    const cacheKey = this.generateCacheKey(key, tenantId);
    const metaKey = this.generateMetadataKey(key, tenantId);

    const cached = await this.storage.get(cacheKey);
    if (cached === null) return null;

    const metadata = (await this.storage.get(metaKey)) as CacheEntryMetadata | null;
    if (!metadata) return null;

    // Check if data is beyond max age
    const now = Date.now();
    const rule = this.getRule(metadata.resourceType);
    if (rule && now - metadata.cachedAt > rule.maxAgeMs) {
      // Data is too old, remove and return null
      await this.storage.delete(cacheKey);
      await this.storage.delete(metaKey);
      return null;
    }

    return cached;
  }

  /**
   * Store data in cache with metadata
   */
  async put(
    key: string,
    tenantId: string,
    data: unknown,
    resourceType: ClinicalResourceType,
  ): Promise<void> {
    const rule = this.getRule(resourceType);
    if (!rule) {
      throw new Error(`No caching rule defined for resource type: ${resourceType}`);
    }

    const cacheKey = this.generateCacheKey(key, tenantId);
    const metaKey = this.generateMetadataKey(key, tenantId);

    const metadata: CacheEntryMetadata = {
      cachedAt: Date.now(),
      resourceType,
      tenantId,
      staleWarningMs: rule.staleWarningMs,
    };

    await this.storage.set(cacheKey, data);
    await this.storage.set(metaKey, metadata);
  }

  /**
   * Check if cached data is stale (RUTH: shows "data may be stale" warning)
   */
  async isStale(key: string, tenantId: string): Promise<boolean> {
    const metaKey = this.generateMetadataKey(key, tenantId);
    const metadata = (await this.storage.get(metaKey)) as CacheEntryMetadata | null;

    if (!metadata) return true; // No metadata = definitely stale

    const now = Date.now();
    const ageMs = now - metadata.cachedAt;

    return ageMs > metadata.staleWarningMs;
  }

  /**
   * Get staleness status with details
   * Used to determine if "offline — pending review" watermark should display (ELENA)
   */
  async getStalenessInfo(
    key: string,
    tenantId: string,
  ): Promise<{ isStale: boolean; ageMs: number; rule: ClinicalCacheRule | null }> {
    const metaKey = this.generateMetadataKey(key, tenantId);
    const metadata = (await this.storage.get(metaKey)) as CacheEntryMetadata | null;

    if (!metadata) {
      return { isStale: true, ageMs: Infinity, rule: null };
    }

    const now = Date.now();
    const ageMs = now - metadata.cachedAt;
    const rule = this.getRule(metadata.resourceType);

    return {
      isStale: ageMs > metadata.staleWarningMs,
      ageMs,
      rule,
    };
  }

  /**
   * Evict all cached data for a tenant (CYRUS: logout)
   */
  async evict(tenantId: string): Promise<void> {
    const pattern = `^(cache|meta):${tenantId}:`;
    const keysToDelete = await this.storage.keys(pattern);

    for (const key of keysToDelete) {
      await this.storage.delete(key);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getStatistics(): Promise<{
    totalEntries: number;
    entriesByTenant: Record<string, number>;
  }> {
    const allKeys = await this.storage.keys();
    const cacheKeys = allKeys.filter((k) => k.startsWith('cache:'));

    const entriesByTenant: Record<string, number> = {};
    for (const key of cacheKeys) {
      const parts = key.split(':');
      if (parts.length >= 3) {
        const tenantId = parts[1];
        entriesByTenant[tenantId] = (entriesByTenant[tenantId] ?? 0) + 1;
      }
    }

    return {
      totalEntries: cacheKeys.length,
      entriesByTenant,
    };
  }
}

/**
 * Cache strategy implementations
 * These are the actual fetch/cache logic used by the service worker
 */

export class CacheStrategyExecutor {
  constructor(private cacheManager: ClinicalCacheManager, private storage: IStorageBackend) {}

  /**
   * CACHE_FIRST: Try cache first, fall back to network
   * Used for reference data and static resources
   */
  async cacheFirst(
    resourceKey: string,
    tenantId: string,
    resourceType: ClinicalResourceType,
    fetchFn: () => Promise<unknown>,
  ): Promise<unknown> {
    // Try cache
    const cached = await this.cacheManager.get(resourceKey, tenantId);
    if (cached !== null) {
      return cached;
    }

    // Fall back to network
    const data = await fetchFn();
    await this.cacheManager.put(resourceKey, tenantId, data, resourceType);
    return data;
  }

  /**
   * NETWORK_FIRST: Try network first, fall back to cache
   * Used for safety-critical data that must be fresh
   */
  async networkFirst(
    resourceKey: string,
    tenantId: string,
    resourceType: ClinicalResourceType,
    fetchFn: () => Promise<unknown>,
  ): Promise<unknown | null> {
    try {
      const data = await fetchFn();
      await this.cacheManager.put(resourceKey, tenantId, data, resourceType);
      return data;
    } catch (error) {
      // Network failed, try cache
      const cached = await this.cacheManager.get(resourceKey, tenantId);
      return cached;
    }
  }

  /**
   * STALE_WHILE_REVALIDATE: Use cache while fetching fresh data in background
   * Used for data that can be slightly stale but benefits from fresh updates
   */
  async staleWhileRevalidate(
    resourceKey: string,
    tenantId: string,
    resourceType: ClinicalResourceType,
    fetchFn: () => Promise<unknown>,
  ): Promise<unknown | null> {
    const cached = await this.cacheManager.get(resourceKey, tenantId);

    // Fire background update (don't wait)
    fetchFn()
      .then((data) => this.cacheManager.put(resourceKey, tenantId, data, resourceType))
      .catch((error) => {
        // Log but don't throw - QUINN: never block on sync failure
        console.warn(`Background revalidation failed for ${resourceKey}:`, error);
      });

    return cached;
  }

  /**
   * NETWORK_ONLY: Always fetch from network, no caching
   * Used for highly sensitive real-time data
   */
  async networkOnly(fetchFn: () => Promise<unknown>): Promise<unknown> {
    return fetchFn();
  }
}
