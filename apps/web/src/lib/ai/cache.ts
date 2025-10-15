/**
 * AI Response Caching Layer
 *
 * Caches AI responses using Redis to:
 * - Reduce API costs (60% cost savings with 60% hit rate)
 * - Improve response times (instant cache hits)
 * - Reduce provider load
 *
 * Cache Strategy:
 * - TTL: 24 hours (86400 seconds)
 * - Key: SHA-256 hash of (messages + provider + systemPrompt)
 * - Store: Full ChatResponse including usage data
 */

import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import type { ChatRequest, ChatResponse } from './chat';

// Initialize Upstash Redis client
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Cache TTL: 24 hours
const CACHE_TTL = 86400; // seconds

// Cache namespace for AI responses
const CACHE_PREFIX = 'ai:response:';

/**
 * Generate cache key from request
 */
function generateCacheKey(request: ChatRequest): string {
  const payload = JSON.stringify({
    messages: request.messages,
    provider: request.provider || 'claude',
    systemPrompt: request.systemPrompt || '',
    // Exclude temperature/maxTokens as they don't significantly affect semantic content
  });

  // Generate SHA-256 hash
  const hash = createHash('sha256').update(payload).digest('hex');

  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached AI response
 */
export async function getCachedResponse(
  request: ChatRequest
): Promise<ChatResponse | null> {
  if (!redis) {
    console.warn('[AI Cache] Redis not configured, cache disabled');
    return null;
  }

  try {
    const cacheKey = generateCacheKey(request);
    const cached = await redis.get<ChatResponse>(cacheKey);

    if (cached) {
      console.log(`[AI Cache] HIT - Key: ${cacheKey.substring(0, 40)}...`);
      return {
        ...cached,
        // Add indicator that this was from cache
        cached: true,
      } as ChatResponse & { cached?: boolean };
    }

    console.log(`[AI Cache] MISS - Key: ${cacheKey.substring(0, 40)}...`);
    return null;
  } catch (error) {
    console.error('[AI Cache] Error fetching from cache:', error);
    return null;
  }
}

/**
 * Store AI response in cache
 */
export async function setCachedResponse(
  request: ChatRequest,
  response: ChatResponse
): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const cacheKey = generateCacheKey(request);

    // Store response with TTL
    await redis.setex(cacheKey, CACHE_TTL, response);

    console.log(
      `[AI Cache] STORED - Key: ${cacheKey.substring(0, 40)}... | TTL: ${CACHE_TTL}s`
    );
  } catch (error) {
    console.error('[AI Cache] Error storing in cache:', error);
  }
}

/**
 * Invalidate cache for specific request
 */
export async function invalidateCache(request: ChatRequest): Promise<void> {
  if (!redis) {
    return;
  }

  try {
    const cacheKey = generateCacheKey(request);
    await redis.del(cacheKey);

    console.log(`[AI Cache] INVALIDATED - Key: ${cacheKey.substring(0, 40)}...`);
  } catch (error) {
    console.error('[AI Cache] Error invalidating cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  estimatedSize: string;
}> {
  if (!redis) {
    return { totalKeys: 0, estimatedSize: '0 MB' };
  }

  try {
    // Count keys with AI response prefix
    const keys = await redis.keys(`${CACHE_PREFIX}*`);
    const totalKeys = Array.isArray(keys) ? keys.length : 0;

    // Estimate size (rough calculation)
    const avgResponseSize = 2000; // bytes
    const estimatedBytes = totalKeys * avgResponseSize;
    const estimatedMB = (estimatedBytes / 1024 / 1024).toFixed(2);

    return {
      totalKeys,
      estimatedSize: `${estimatedMB} MB`,
    };
  } catch (error) {
    console.error('[AI Cache] Error fetching stats:', error);
    return { totalKeys: 0, estimatedSize: '0 MB' };
  }
}

/**
 * Clear all AI response cache
 * WARNING: Use with caution in production
 */
export async function clearAllCache(): Promise<number> {
  if (!redis) {
    return 0;
  }

  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`);

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      console.log('[AI Cache] No keys to clear');
      return 0;
    }

    // Delete all keys in batch
    await Promise.all(keys.map(key => redis.del(key)));

    console.log(`[AI Cache] CLEARED ${keys.length} keys`);
    return keys.length;
  } catch (error) {
    console.error('[AI Cache] Error clearing cache:', error);
    return 0;
  }
}

/**
 * Wrapper for chat function with caching
 */
export async function chatWithCache(
  request: ChatRequest,
  chatFunction: (req: ChatRequest) => Promise<ChatResponse>
): Promise<ChatResponse> {
  // Try to get from cache first
  const cached = await getCachedResponse(request);

  if (cached) {
    return cached;
  }

  // Cache miss - make actual API call
  const response = await chatFunction(request);

  // Store in cache if successful
  if (response.success) {
    await setCachedResponse(request, response);
  }

  return response;
}

/**
 * Export cache health check for monitoring
 */
export async function cacheHealthCheck(): Promise<{
  isHealthy: boolean;
  isConfigured: boolean;
  stats?: { totalKeys: number; estimatedSize: string };
  error?: string;
}> {
  if (!redis) {
    return {
      isHealthy: false,
      isConfigured: false,
      error: 'Redis not configured',
    };
  }

  try {
    // Test Redis connection with ping
    const pingResult = await redis.ping();

    if (pingResult !== 'PONG') {
      return {
        isHealthy: false,
        isConfigured: true,
        error: 'Redis ping failed',
      };
    }

    const stats = await getCacheStats();

    return {
      isHealthy: true,
      isConfigured: true,
      stats,
    };
  } catch (error: any) {
    return {
      isHealthy: false,
      isConfigured: true,
      error: error.message,
    };
  }
}
