"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedResponse = getCachedResponse;
exports.setCachedResponse = setCachedResponse;
exports.invalidateCache = invalidateCache;
exports.getCacheStats = getCacheStats;
exports.clearAllCache = clearAllCache;
exports.chatWithCache = chatWithCache;
exports.cacheHealthCheck = cacheHealthCheck;
const redis_1 = require("@upstash/redis");
const crypto_1 = require("crypto");
// Initialize Upstash Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new redis_1.Redis({
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
function generateCacheKey(request) {
    const payload = JSON.stringify({
        messages: request.messages,
        provider: request.provider || 'claude',
        systemPrompt: request.systemPrompt || '',
        // Exclude temperature/maxTokens as they don't significantly affect semantic content
    });
    // Generate SHA-256 hash
    const hash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
    return `${CACHE_PREFIX}${hash}`;
}
/**
 * Get cached AI response
 */
async function getCachedResponse(request) {
    if (!redis) {
        console.warn('[AI Cache] Redis not configured, cache disabled');
        return null;
    }
    try {
        const cacheKey = generateCacheKey(request);
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log(`[AI Cache] HIT - Key: ${cacheKey.substring(0, 40)}...`);
            return {
                ...cached,
                // Add indicator that this was from cache
                cached: true,
            };
        }
        console.log(`[AI Cache] MISS - Key: ${cacheKey.substring(0, 40)}...`);
        return null;
    }
    catch (error) {
        console.error('[AI Cache] Error fetching from cache:', error);
        return null;
    }
}
/**
 * Store AI response in cache
 */
async function setCachedResponse(request, response) {
    if (!redis) {
        return;
    }
    try {
        const cacheKey = generateCacheKey(request);
        // Store response with TTL
        await redis.setex(cacheKey, CACHE_TTL, response);
        console.log(`[AI Cache] STORED - Key: ${cacheKey.substring(0, 40)}... | TTL: ${CACHE_TTL}s`);
    }
    catch (error) {
        console.error('[AI Cache] Error storing in cache:', error);
    }
}
/**
 * Invalidate cache for specific request
 */
async function invalidateCache(request) {
    if (!redis) {
        return;
    }
    try {
        const cacheKey = generateCacheKey(request);
        await redis.del(cacheKey);
        console.log(`[AI Cache] INVALIDATED - Key: ${cacheKey.substring(0, 40)}...`);
    }
    catch (error) {
        console.error('[AI Cache] Error invalidating cache:', error);
    }
}
/**
 * Get cache statistics
 */
async function getCacheStats() {
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
    }
    catch (error) {
        console.error('[AI Cache] Error fetching stats:', error);
        return { totalKeys: 0, estimatedSize: '0 MB' };
    }
}
/**
 * Clear all AI response cache
 * WARNING: Use with caution in production
 */
async function clearAllCache() {
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
    }
    catch (error) {
        console.error('[AI Cache] Error clearing cache:', error);
        return 0;
    }
}
/**
 * Wrapper for chat function with caching
 */
async function chatWithCache(request, chatFunction) {
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
async function cacheHealthCheck() {
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
    }
    catch (error) {
        return {
            isHealthy: false,
            isConfigured: true,
            error: error.message,
        };
    }
}
//# sourceMappingURL=cache.js.map