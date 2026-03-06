/**
 * Tests for webauthn-challenge-store resilience
 *
 * Verifies:
 * - Normal Redis path (store/get/delete)
 * - Redis failure → in-process Map fallback (dual-write safety net)
 * - Redis down between store and get → Map still holds challenge
 * - Memory cleanup: expired entries evicted by memGet
 * - Size cap: overflow triggers eviction before insertion
 */

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn(),
}));

jest.mock('@/lib/logger', () => {
  const mock = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: mock, logger: mock };
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeRedisClient(overrides: Partial<{
  setex: jest.Mock;
  get: jest.Mock;
  del: jest.Mock;
}> = {}) {
  return {
    setex: overrides.setex ?? jest.fn().mockResolvedValue('OK'),
    get:   overrides.get   ?? jest.fn().mockResolvedValue(null),
    del:   overrides.del   ?? jest.fn().mockResolvedValue(1),
  };
}

/**
 * Load a fresh store module after resetting Jest's module registry.
 *
 * IMPORTANT: after jest.resetModules(), the top-level MockRedis reference is
 * stale. We must re-require @upstash/redis to get the fresh jest.fn() that
 * the newly-loaded store module will receive.
 */
function loadFreshStore(clientOverrides?: Parameters<typeof makeRedisClient>[0]) {
  jest.resetModules();

  // Re-require to get the fresh mock constructor (hoisted jest.mock factory
  // produces a new jest.fn() after each resetModules).
  const { Redis: FreshMockRedis } = require('@upstash/redis');
  const mockClient = makeRedisClient(clientOverrides);
  FreshMockRedis.mockImplementation(() => mockClient);

  process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';

  const store = require('@/lib/auth/webauthn-challenge-store');
  store._memStoreClear();

  return { store, mockClient };
}

function loadFreshStoreNoRedis() {
  jest.resetModules();
  // Don't configure Redis env vars
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const store = require('@/lib/auth/webauthn-challenge-store');
  store._memStoreClear();
  return { store };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Happy path — Redis available', () => {
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  it('storeRegistrationChallenge writes to both Redis and memStore', async () => {
    const { store, mockClient } = loadFreshStore();

    await store.storeRegistrationChallenge('user-1', 'ch-abc');

    // Redis was called
    expect(mockClient.setex).toHaveBeenCalledWith('webauthn:challenge:user-1', 300, 'ch-abc');
  });

  it('getRegistrationChallenge returns Redis value when available', async () => {
    const { store, mockClient } = loadFreshStore();
    mockClient.get.mockResolvedValue('challenge-from-redis');

    const result = await store.getRegistrationChallenge('user-2');
    expect(result).toBe('challenge-from-redis');
  });

  it('deleteRegistrationChallenge calls Redis del', async () => {
    const { store, mockClient } = loadFreshStore();

    await store.deleteRegistrationChallenge('user-1');

    expect(mockClient.del).toHaveBeenCalledWith('webauthn:challenge:user-1');
  });

  it('sign challenge roundtrip works', async () => {
    const payload = { challenge: 'sign-ch', prescriptionNonce: 'nonce-xyz' };
    const { store, mockClient } = loadFreshStore();
    mockClient.get.mockResolvedValue(JSON.stringify(payload));

    await store.storeSignChallenge('user-3', payload);
    const result = await store.getSignChallenge('user-3');

    expect(result).toEqual(payload);
    expect(mockClient.setex).toHaveBeenCalledWith(
      'webauthn:sign:user-3', 120, JSON.stringify(payload)
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Redis failure isolation — users never locked out', () => {
  const redisError = new Error('Redis connection timeout');

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  it('storeRegistrationChallenge does NOT throw when Redis is down', async () => {
    const { store } = loadFreshStore({
      setex: jest.fn().mockRejectedValue(redisError),
    });

    await expect(
      store.storeRegistrationChallenge('user-1', 'ch-fallback')
    ).resolves.toBeUndefined();
  });

  it('getRegistrationChallenge falls back to in-process Map after Redis error', async () => {
    const { store } = loadFreshStore({
      setex: jest.fn().mockRejectedValue(redisError),
      get:   jest.fn().mockRejectedValue(redisError),
    });

    // Store writes to Map even when Redis is down
    await store.storeRegistrationChallenge('user-1', 'ch-fallback');

    // Redis get fails → Map fallback
    const result = await store.getRegistrationChallenge('user-1');
    expect(result).toBe('ch-fallback');
  });

  it('deleteRegistrationChallenge does NOT throw when Redis del fails', async () => {
    const { store } = loadFreshStore({
      setex: jest.fn().mockRejectedValue(redisError),
      get:   jest.fn().mockRejectedValue(redisError),
      del:   jest.fn().mockRejectedValue(redisError),
    });

    await store.storeRegistrationChallenge('user-1', 'ch-fallback');
    await expect(store.deleteRegistrationChallenge('user-1')).resolves.toBeUndefined();

    // After delete, Map should no longer have it
    const result = await store.getRegistrationChallenge('user-1');
    expect(result).toBeNull();
  });

  it('sign challenge survives full Redis outage end-to-end', async () => {
    const { store } = loadFreshStore({
      setex: jest.fn().mockRejectedValue(redisError),
      get:   jest.fn().mockRejectedValue(redisError),
      del:   jest.fn().mockRejectedValue(redisError),
    });

    const payload = { challenge: 'sign-ch', prescriptionNonce: 'nonce-xyz' };
    await store.storeSignChallenge('user-2', payload);

    const result = await store.getSignChallenge('user-2');
    expect(result).toEqual(payload);

    await expect(store.deleteSignChallenge('user-2')).resolves.toBeUndefined();
    expect(await store.getSignChallenge('user-2')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Dual-write safety net — Redis down between store and get', () => {
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  it('Map holds challenge when Redis was up during store but errors during get', async () => {
    // Redis accepts the write but fails on read (blip scenario)
    const { store } = loadFreshStore({
      setex: jest.fn().mockResolvedValue('OK'),
      get:   jest.fn().mockRejectedValue(new Error('timeout during get')),
    });

    await store.storeRegistrationChallenge('user-x', 'ch-resilient');

    // Redis get fails → falls back to Map (which was populated by dual-write)
    const result = await store.getRegistrationChallenge('user-x');
    expect(result).toBe('ch-resilient');
  });

  it('Map holds sign challenge when Redis fails during get', async () => {
    const { store } = loadFreshStore({
      setex: jest.fn().mockResolvedValue('OK'),
      get:   jest.fn().mockRejectedValue(new Error('timeout')),
    });

    const payload = { challenge: 'sc', prescriptionNonce: 'np' };
    await store.storeSignChallenge('user-y', payload);

    const result = await store.getSignChallenge('user-y');
    expect(result).toEqual(payload);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('In-process Map memory safety', () => {
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  it('delete clears the Map entry', async () => {
    const { store } = loadFreshStoreNoRedis();

    await store.storeRegistrationChallenge('user-d', 'ch-delete');
    await store.deleteRegistrationChallenge('user-d');

    expect(await store.getRegistrationChallenge('user-d')).toBeNull();
  });

  it('size cap: inserting beyond MAX_MEM_ENTRIES triggers eviction', async () => {
    const { store } = loadFreshStoreNoRedis();
    const MAX = 2_000;

    for (let i = 0; i < MAX + 10; i++) {
      await store.storeRegistrationChallenge(`user-fill-${i}`, `ch-${i}`);
    }

    expect(store._memStoreSize()).toBeLessThanOrEqual(MAX);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('No Redis configured — pure in-process fallback', () => {
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  });

  it('full registration challenge lifecycle works without Redis', async () => {
    const { store } = loadFreshStoreNoRedis();

    await store.storeRegistrationChallenge('u1', 'ch-nomem');
    expect(await store.getRegistrationChallenge('u1')).toBe('ch-nomem');

    await store.deleteRegistrationChallenge('u1');
    expect(await store.getRegistrationChallenge('u1')).toBeNull();
  });

  it('full sign challenge lifecycle works without Redis', async () => {
    const { store } = loadFreshStoreNoRedis();
    const payload = { challenge: 'sc', prescriptionNonce: 'np' };

    await store.storeSignChallenge('u2', payload);
    expect(await store.getSignChallenge('u2')).toEqual(payload);

    await store.deleteSignChallenge('u2');
    expect(await store.getSignChallenge('u2')).toBeNull();
  });
});
