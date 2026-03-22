/**
 * Cache Strategies Tests
 * Test clinical caching with CYRUS and RUTH invariants
 */

import {
  ClinicalCacheManager,
  CacheStrategyExecutor,
  InMemoryStorageBackend,
} from '../cache-strategies';

describe('ClinicalCacheManager', () => {
  let cacheManager: ClinicalCacheManager;
  let storage: InMemoryStorageBackend;

  beforeEach(() => {
    storage = new InMemoryStorageBackend();
    cacheManager = new ClinicalCacheManager(storage);
  });

  describe('Default Rules', () => {
    it('should initialize with default clinical rules', () => {
      expect(cacheManager.getRule('patient-demographics')).not.toBeNull();
      expect(cacheManager.getRule('active-medications')).not.toBeNull();
      expect(cacheManager.getRule('lab-results')).not.toBeNull();
      expect(cacheManager.getRule('vital-signs')).not.toBeNull();
      expect(cacheManager.getRule('reference-data')).not.toBeNull();
    });

    it('should have correct caching strategy for patient-demographics', () => {
      const rule = cacheManager.getRule('patient-demographics');
      expect(rule?.strategy).toBe('CACHE_FIRST');
      expect(rule?.maxAgeMs).toBe(24 * 60 * 60 * 1000);
    });

    it('should have NETWORK_FIRST for safety-critical active-medications', () => {
      const rule = cacheManager.getRule('active-medications');
      expect(rule?.strategy).toBe('NETWORK_FIRST');
      expect(rule?.maxAgeMs).toBe(15 * 60 * 1000);
      expect(rule?.staleWarningMs).toBe(5 * 60 * 1000);
    });

    it('should have STALE_WHILE_REVALIDATE for lab-results', () => {
      const rule = cacheManager.getRule('lab-results');
      expect(rule?.strategy).toBe('STALE_WHILE_REVALIDATE');
      expect(rule?.maxAgeMs).toBe(4 * 60 * 60 * 1000);
    });
  });

  describe('CYRUS: Tenant Isolation', () => {
    it('should enforce tenantScoped=true on all rules', () => {
      const resourceTypes = [
        'patient-demographics',
        'active-medications',
        'lab-results',
        'vital-signs',
        'reference-data',
      ] as const;

      for (const type of resourceTypes) {
        const rule = cacheManager.getRule(type);
        expect(rule?.tenantScoped).toBe(true);
      }
    });

    it('should throw error when adding non-tenant-scoped rule', () => {
      expect(() => {
        cacheManager.addRule({
          resourceType: 'test-resource',
          strategy: 'CACHE_FIRST',
          maxAgeMs: 1000,
          staleWarningMs: 500,
          tenantScoped: false, // CYRUS violation!
          offlineWritable: false,
        });
      }).toThrow('must have tenantScoped=true');
    });

    it('should isolate cache between tenants', async () => {
      const tenantA = 'tenant-abc-123';
      const tenantB = 'tenant-xyz-789';
      const resourceKey = 'patient-demographics:patient-001';

      await cacheManager.put(resourceKey, tenantA, { name: 'Alice' }, 'patient-demographics');
      await cacheManager.put(resourceKey, tenantB, { name: 'Bob' }, 'patient-demographics');

      const dataA = await cacheManager.get(resourceKey, tenantA);
      const dataB = await cacheManager.get(resourceKey, tenantB);

      expect(dataA).toEqual({ name: 'Alice' });
      expect(dataB).toEqual({ name: 'Bob' });
    });

    it('should completely evict tenant data on logout', async () => {
      const tenantId = 'tenant-abc-123';
      const resourceKey = 'patient-demographics:patient-001';

      await cacheManager.put(resourceKey, tenantId, { name: 'Alice' }, 'patient-demographics');
      expect(await cacheManager.get(resourceKey, tenantId)).not.toBeNull();

      // Logout - evict tenant
      await cacheManager.evict(tenantId);

      // Data should be gone
      expect(await cacheManager.get(resourceKey, tenantId)).toBeNull();
    });
  });

  describe('Cache Operations', () => {
    const tenantId = 'tenant-123';

    it('should store and retrieve data', async () => {
      const key = 'vitals-001';
      const data = { heart_rate: 72, temperature: 37.2 };

      await cacheManager.put(key, tenantId, data, 'vital-signs');
      const retrieved = await cacheManager.get(key, tenantId);

      expect(retrieved).toEqual(data);
    });

    it('should return null for missing data', async () => {
      const retrieved = await cacheManager.get('nonexistent-key', tenantId);
      expect(retrieved).toBeNull();
    });

    it('should remove expired data', async () => {
      const key = 'med-001';
      const data = { medication: 'aspirin' };

      // Mock time for testing
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      await cacheManager.put(key, tenantId, data, 'active-medications');
      expect(await cacheManager.get(key, tenantId)).not.toBeNull();

      // Advance time past maxAge (15 minutes)
      currentTime += 16 * 60 * 1000;

      // Data should be gone
      expect(await cacheManager.get(key, tenantId)).toBeNull();

      Date.now = originalDateNow;
    });
  });

  describe('RUTH: Staleness Detection', () => {
    const tenantId = 'tenant-123';

    it('should detect fresh data', async () => {
      const key = 'med-001';
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      await cacheManager.put(key, tenantId, { med: 'aspirin' }, 'active-medications');

      // Data is fresh (within staleWarningMs)
      const isStale = await cacheManager.isStale(key, tenantId);
      expect(isStale).toBe(false);

      Date.now = originalDateNow;
    });

    it('should detect stale data (RUTH warning)', async () => {
      const key = 'med-001';
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      await cacheManager.put(key, tenantId, { med: 'aspirin' }, 'active-medications');

      // Advance past staleWarningMs (5 minutes)
      currentTime += 6 * 60 * 1000;

      const isStale = await cacheManager.isStale(key, tenantId);
      expect(isStale).toBe(true);

      Date.now = originalDateNow;
    });

    it('should provide staleness info with details', async () => {
      const key = 'lab-001';
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      await cacheManager.put(key, tenantId, { result: 'positive' }, 'lab-results');

      currentTime += 2 * 60 * 60 * 1000; // 2 hours

      const info = await cacheManager.getStalenessInfo(key, tenantId);
      expect(info.isStale).toBe(true);
      expect(info.ageMs).toBeGreaterThanOrEqual(2 * 60 * 60 * 1000);
      expect(info.rule?.staleWarningMs).toBe(1 * 60 * 60 * 1000);

      Date.now = originalDateNow;
    });

    it('should show stale warning for medications within warning threshold', async () => {
      const key = 'med-002';
      const originalDateNow = Date.now;
      let currentTime = 1000000;
      Date.now = jest.fn(() => currentTime);

      await cacheManager.put(key, tenantId, { med: 'lisinopril' }, 'active-medications');

      // Advance past staleWarningMs but not maxAgeMs
      // staleWarningMs: 5 min, maxAgeMs: 15 min
      currentTime += 7 * 60 * 1000;

      const isStale = await cacheManager.isStale(key, tenantId);
      expect(isStale).toBe(true);

      // Data should still be retrievable but marked stale
      const data = await cacheManager.get(key, tenantId);
      expect(data).not.toBeNull();

      Date.now = originalDateNow;
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache entries by tenant', async () => {
      const tenantA = 'tenant-a';
      const tenantB = 'tenant-b';

      await cacheManager.put('key1', tenantA, { data: 1 }, 'patient-demographics');
      await cacheManager.put('key2', tenantA, { data: 2 }, 'vital-signs');
      await cacheManager.put('key3', tenantB, { data: 3 }, 'lab-results');

      const stats = await cacheManager.getStatistics();

      expect(stats.totalEntries).toBeGreaterThanOrEqual(3);
      expect(stats.entriesByTenant[tenantA]).toBe(2);
      expect(stats.entriesByTenant[tenantB]).toBe(1);
    });
  });

  describe('Custom Rules', () => {
    it('should allow adding custom rules', () => {
      cacheManager.addRule({
        resourceType: 'custom-resource',
        strategy: 'CACHE_FIRST',
        maxAgeMs: 60000,
        staleWarningMs: 30000,
        tenantScoped: true,
        offlineWritable: true,
      });

      const rule = cacheManager.getRule('custom-resource');
      expect(rule).not.toBeNull();
      expect(rule?.strategy).toBe('CACHE_FIRST');
    });
  });
});

describe('CacheStrategyExecutor', () => {
  let cacheManager: ClinicalCacheManager;
  let executor: CacheStrategyExecutor;
  let storage: InMemoryStorageBackend;
  const tenantId = 'tenant-123';

  beforeEach(() => {
    storage = new InMemoryStorageBackend();
    cacheManager = new ClinicalCacheManager(storage);
    executor = new CacheStrategyExecutor(cacheManager, storage);
  });

  describe('CACHE_FIRST Strategy', () => {
    it('should return cached data without calling fetch', async () => {
      const resourceKey = 'ref-001';
      const cachedData = { code: 'ICD-10-A01' };

      await cacheManager.put(resourceKey, tenantId, cachedData, 'reference-data');

      const fetchFn = jest.fn();
      const result = await executor.cacheFirst(
        resourceKey,
        tenantId,
        'reference-data',
        fetchFn,
      );

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache when cache miss', async () => {
      const resourceKey = 'ref-002';
      const networkData = { code: 'ICD-10-A02' };

      const fetchFn = jest.fn().mockResolvedValue(networkData);
      const result = await executor.cacheFirst(
        resourceKey,
        tenantId,
        'reference-data',
        fetchFn,
      );

      expect(result).toEqual(networkData);
      expect(fetchFn).toHaveBeenCalled();

      // Data should be cached
      const cached = await cacheManager.get(resourceKey, tenantId);
      expect(cached).toEqual(networkData);
    });
  });

  describe('NETWORK_FIRST Strategy', () => {
    it('should use network data when available', async () => {
      const resourceKey = 'med-001';
      const networkData = { medication: 'aspirin' };

      const fetchFn = jest.fn().mockResolvedValue(networkData);
      const result = await executor.networkFirst(
        resourceKey,
        tenantId,
        'active-medications',
        fetchFn,
      );

      expect(result).toEqual(networkData);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should fall back to cache on network error', async () => {
      const resourceKey = 'med-002';
      const cachedData = { medication: 'lisinopril' };

      // Pre-populate cache
      await cacheManager.put(resourceKey, tenantId, cachedData, 'active-medications');

      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await executor.networkFirst(
        resourceKey,
        tenantId,
        'active-medications',
        fetchFn,
      );

      expect(result).toEqual(cachedData);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should return null when no cache and network fails', async () => {
      const resourceKey = 'med-003';
      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await executor.networkFirst(
        resourceKey,
        tenantId,
        'active-medications',
        fetchFn,
      );

      expect(result).toBeNull();
    });
  });

  describe('STALE_WHILE_REVALIDATE Strategy', () => {
    it('should return cached data immediately', async () => {
      const resourceKey = 'lab-001';
      const cachedData = { result: 'positive' };

      await cacheManager.put(resourceKey, tenantId, cachedData, 'lab-results');

      const fetchFn = jest.fn().mockResolvedValue(cachedData);
      const result = await executor.staleWhileRevalidate(
        resourceKey,
        tenantId,
        'lab-results',
        fetchFn,
      );

      expect(result).toEqual(cachedData);
    });

    it('should update cache in background', async () => {
      const resourceKey = 'lab-002';
      const cachedData = { result: 'old' };
      const newData = { result: 'new' };

      await cacheManager.put(resourceKey, tenantId, cachedData, 'lab-results');

      const fetchFn = jest.fn().mockResolvedValue(newData);
      const result = await executor.staleWhileRevalidate(
        resourceKey,
        tenantId,
        'lab-results',
        fetchFn,
      );

      expect(result).toEqual(cachedData);

      // Wait for background update
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Cache should be updated
      const cached = await cacheManager.get(resourceKey, tenantId);
      expect(cached).toEqual(newData);
    });

    it('should handle background fetch errors gracefully (QUINN)', async () => {
      const resourceKey = 'lab-003';
      const cachedData = { result: 'stale' };

      await cacheManager.put(resourceKey, tenantId, cachedData, 'lab-results');

      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await executor.staleWhileRevalidate(
        resourceKey,
        tenantId,
        'lab-results',
        fetchFn,
      );

      // Should still return cached data despite error
      expect(result).toEqual(cachedData);

      // Wait for background task
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should have logged warning but not thrown
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('NETWORK_ONLY Strategy', () => {
    it('should always fetch from network', async () => {
      const networkData = { data: 'network-only' };
      const fetchFn = jest.fn().mockResolvedValue(networkData);

      const result = await executor.networkOnly(fetchFn);

      expect(result).toEqual(networkData);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should throw on network error', async () => {
      const fetchFn = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(executor.networkOnly(fetchFn)).rejects.toThrow('Network error');
    });
  });
});
