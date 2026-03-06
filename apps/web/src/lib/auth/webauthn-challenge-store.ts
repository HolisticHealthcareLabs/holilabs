/**
 * WebAuthn challenge store
 *
 * Stores registration and signing challenges keyed by userId.
 *
 * Resilience strategy (defence-in-depth):
 *
 *  1. DUAL-WRITE: every challenge is written to BOTH Redis and the in-process
 *     Map. On read, Redis is tried first; on any Redis error the Map is the
 *     authoritative fallback. This means a Redis blip between store and get
 *     never locks the user out.
 *
 *  2. REDIS ISOLATION: every Redis call is wrapped in try/catch. A timeout,
 *     auth failure, or connection error is logged and gracefully bypassed —
 *     the in-process Map carries the ceremony through to completion.
 *
 *  3. BOUNDED MAP: the in-process Map is capped at MAX_MEM_ENTRIES. When the
 *     cap is hit, a sweep evicts all expired entries first; if still over the
 *     cap, the oldest 25% of entries are evicted. This prevents unbounded
 *     growth during prolonged Redis outages.
 *
 *  4. PERIODIC CLEANUP: a background interval (unref'd so it never prevents
 *     process exit) sweeps expired entries every CLEANUP_INTERVAL_MS.
 */

import { Redis } from '@upstash/redis';
import logger from '@/lib/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CHALLENGE_TTL = 300;    // 5 min — registration ceremonies
const SIGN_TTL = 120;         // 2 min — signing ceremonies

const MAX_MEM_ENTRIES = 2_000;
const CLEANUP_INTERVAL_MS = 60_000;  // sweep every minute

// ─────────────────────────────────────────────────────────────────────────────
// Redis client (Upstash HTTP — no persistent connection, failure is per-call)
// ─────────────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-process Map (ordered insertion → enables oldest-first eviction)
// ─────────────────────────────────────────────────────────────────────────────

interface MemEntry {
  value: string;
  expiresAt: number;
  insertedAt: number;
}

const memStore = new Map<string, MemEntry>();

function memSet(key: string, value: string, ttlSeconds: number): void {
  _enforceSizeCap();
  memStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
    insertedAt: Date.now(),
  });
}

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memDel(key: string): void {
  memStore.delete(key);
}

/** Evict expired entries; if still over cap, remove oldest 25%. */
function _enforceSizeCap(): void {
  if (memStore.size < MAX_MEM_ENTRIES) return;

  const now = Date.now();
  // Pass 1: sweep expired
  for (const [key, entry] of memStore) {
    if (now > entry.expiresAt) memStore.delete(key);
  }

  if (memStore.size < MAX_MEM_ENTRIES) return;

  // Pass 2: evict oldest-inserted 25%
  const evict = Math.ceil(memStore.size * 0.25);
  let count = 0;
  for (const key of memStore.keys()) {
    if (count++ >= evict) break;
    memStore.delete(key);
  }
}

// Background sweep — runs every minute, does not hold the process alive.
if (typeof setInterval !== 'undefined') {
  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore) {
      if (now > entry.expiresAt) memStore.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);

  // unref: don't block process exit in test / serverless environments
  if (typeof sweepTimer === 'object' && sweepTimer !== null && 'unref' in sweepTimer) {
    (sweepTimer as ReturnType<typeof setInterval>).unref?.();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis helpers — always isolated, always paired with in-process fallback
// ─────────────────────────────────────────────────────────────────────────────

async function redisSafeSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.setex(key, ttlSeconds, value);
  } catch (err) {
    logger.warn(
      { event: 'webauthn_redis_set_failed', key, error: String(err) },
      'Redis set failed — challenge lives only in-process Map'
    );
  }
}

async function redisSafeGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get<string>(key);
  } catch (err) {
    logger.warn(
      { event: 'webauthn_redis_get_failed', key, error: String(err) },
      'Redis get failed — falling back to in-process Map'
    );
    return null;
  }
}

async function redisSafeDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn(
      { event: 'webauthn_redis_del_failed', key, error: String(err) },
      'Redis del failed — entry will expire naturally'
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Registration challenge
// ─────────────────────────────────────────────────────────────────────────────

export async function storeRegistrationChallenge(
  userId: string,
  challenge: string
): Promise<void> {
  const key = `webauthn:challenge:${userId}`;
  // Dual-write: Map is the safety net if Redis is unavailable during get.
  memSet(key, challenge, CHALLENGE_TTL);
  await redisSafeSet(key, challenge, CHALLENGE_TTL);
}

export async function getRegistrationChallenge(userId: string): Promise<string | null> {
  const key = `webauthn:challenge:${userId}`;
  // Redis first (shares state across instances); Map as fallback.
  const fromRedis = await redisSafeGet(key);
  if (fromRedis !== null) return fromRedis;
  return memGet(key);
}

export async function deleteRegistrationChallenge(userId: string): Promise<void> {
  const key = `webauthn:challenge:${userId}`;
  // Best-effort on both stores — a Redis failure here is non-fatal
  // (the entry will expire naturally via TTL).
  memDel(key);
  await redisSafeDel(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — Sign challenge
// ─────────────────────────────────────────────────────────────────────────────

interface SignPayload {
  challenge: string;
  prescriptionNonce: string;
}

export async function storeSignChallenge(
  userId: string,
  payload: SignPayload
): Promise<void> {
  const key = `webauthn:sign:${userId}`;
  const value = JSON.stringify(payload);
  memSet(key, value, SIGN_TTL);
  await redisSafeSet(key, value, SIGN_TTL);
}

export async function getSignChallenge(userId: string): Promise<SignPayload | null> {
  const key = `webauthn:sign:${userId}`;
  const raw = (await redisSafeGet(key)) ?? memGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignPayload;
  } catch {
    return null;
  }
}

export async function deleteSignChallenge(userId: string): Promise<void> {
  const key = `webauthn:sign:${userId}`;
  memDel(key);
  await redisSafeDel(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported for testing
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the current in-process Map size. Used in tests to verify cleanup. */
export function _memStoreSize(): number {
  return memStore.size;
}

/** Clears the in-process Map. Used in tests only. */
export function _memStoreClear(): void {
  memStore.clear();
}
