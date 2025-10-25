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
import type { ChatRequest, ChatResponse } from './chat';
/**
 * Get cached AI response
 */
export declare function getCachedResponse(request: ChatRequest): Promise<ChatResponse | null>;
/**
 * Store AI response in cache
 */
export declare function setCachedResponse(request: ChatRequest, response: ChatResponse): Promise<void>;
/**
 * Invalidate cache for specific request
 */
export declare function invalidateCache(request: ChatRequest): Promise<void>;
/**
 * Get cache statistics
 */
export declare function getCacheStats(): Promise<{
    totalKeys: number;
    estimatedSize: string;
}>;
/**
 * Clear all AI response cache
 * WARNING: Use with caution in production
 */
export declare function clearAllCache(): Promise<number>;
/**
 * Wrapper for chat function with caching
 */
export declare function chatWithCache(request: ChatRequest, chatFunction: (req: ChatRequest) => Promise<ChatResponse>): Promise<ChatResponse>;
/**
 * Export cache health check for monitoring
 */
export declare function cacheHealthCheck(): Promise<{
    isHealthy: boolean;
    isConfigured: boolean;
    stats?: {
        totalKeys: number;
        estimatedSize: string;
    };
    error?: string;
}>;
//# sourceMappingURL=cache.d.ts.map