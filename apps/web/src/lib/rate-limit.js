"use strict";
/**
 * Rate Limiting Utility
 *
 * Protects API endpoints from abuse using Upstash Redis
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = void 0;
exports.applyRateLimit = applyRateLimit;
exports.withRateLimit = withRateLimit;
exports.checkRateLimit = checkRateLimit;
const ratelimit_1 = require("@upstash/ratelimit");
const redis_1 = require("@upstash/redis");
const server_1 = require("next/server");
const logger_1 = __importDefault(require("./logger"));
// Initialize Redis client
const redis = process.env.UPSTASH_REDIS_REST_URL
    ? new redis_1.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : undefined;
/**
 * Rate limit configurations for different endpoint types
 */
exports.rateLimiters = {
    // Authentication endpoints - 5 requests per minute
    auth: redis
        ? new ratelimit_1.Ratelimit({
            redis,
            limiter: ratelimit_1.Ratelimit.slidingWindow(5, '1 m'),
            analytics: true,
            prefix: '@ratelimit/auth',
        })
        : null,
    // File upload endpoints - 10 uploads per minute
    upload: redis
        ? new ratelimit_1.Ratelimit({
            redis,
            limiter: ratelimit_1.Ratelimit.slidingWindow(10, '1 m'),
            analytics: true,
            prefix: '@ratelimit/upload',
        })
        : null,
    // Message sending - 30 messages per minute
    messages: redis
        ? new ratelimit_1.Ratelimit({
            redis,
            limiter: ratelimit_1.Ratelimit.slidingWindow(30, '1 m'),
            analytics: true,
            prefix: '@ratelimit/messages',
        })
        : null,
    // General API endpoints - 100 requests per minute
    api: redis
        ? new ratelimit_1.Ratelimit({
            redis,
            limiter: ratelimit_1.Ratelimit.slidingWindow(100, '1 m'),
            analytics: true,
            prefix: '@ratelimit/api',
        })
        : null,
    // Search endpoints - 20 requests per minute
    search: redis
        ? new ratelimit_1.Ratelimit({
            redis,
            limiter: ratelimit_1.Ratelimit.slidingWindow(20, '1 m'),
            analytics: true,
            prefix: '@ratelimit/search',
        })
        : null,
};
/**
 * Get identifier from request (IP address or user ID)
 */
function getIdentifier(request, userId) {
    // Prefer userId for authenticated requests
    if (userId) {
        return `user:${userId}`;
    }
    // Fall back to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'anonymous';
    return `ip:${ip}`;
}
/**
 * Apply rate limiting to a request
 */
async function applyRateLimit(request, limiterType, userId) {
    const limiter = exports.rateLimiters[limiterType];
    // If Redis is not configured, allow all requests (dev mode)
    if (!limiter) {
        if (process.env.NODE_ENV === 'development') {
            logger_1.default.debug({
                event: 'rate_limit_disabled',
                limiterType,
                message: 'Rate limiting is disabled (Redis not configured)',
            });
            return { success: true };
        }
        else {
            logger_1.default.warn({
                event: 'rate_limit_not_configured',
                limiterType,
                message: 'Rate limiting is not configured in production!',
            });
            return { success: true };
        }
    }
    try {
        const identifier = getIdentifier(request, userId);
        const { success, limit, reset, remaining } = await limiter.limit(identifier);
        if (!success) {
            logger_1.default.warn({
                event: 'rate_limit_exceeded',
                limiterType,
                identifier,
                limit,
                reset,
                remaining,
            });
            const resetDate = new Date(reset);
            const retryAfter = Math.ceil((reset - Date.now()) / 1000);
            return {
                success: false,
                response: server_1.NextResponse.json({
                    success: false,
                    error: 'Too many requests. Please try again later.',
                    details: {
                        limit,
                        remaining: 0,
                        reset: resetDate.toISOString(),
                        retryAfter,
                    },
                }, {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': reset.toString(),
                        'Retry-After': retryAfter.toString(),
                    },
                }),
            };
        }
        logger_1.default.debug({
            event: 'rate_limit_ok',
            limiterType,
            identifier,
            remaining,
            limit,
        });
        return { success: true };
    }
    catch (error) {
        logger_1.default.error({
            event: 'rate_limit_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            limiterType,
        });
        // On error, allow the request to proceed (fail open)
        return { success: true };
    }
}
/**
 * Rate limit middleware for API routes
 * Usage: export const middleware = withRateLimit('api');
 */
function withRateLimit(limiterType) {
    return async (request) => {
        // Get userId from session if available (simplified)
        const userId = request.headers.get('x-user-id') || undefined;
        const result = await applyRateLimit(request, limiterType, userId);
        if (!result.success && result.response) {
            return result.response;
        }
        // Continue to next middleware/handler
        return server_1.NextResponse.next();
    };
}
/**
 * Manual rate limit check for use in API route handlers
 */
async function checkRateLimit(request, limiterType, userId) {
    const result = await applyRateLimit(request, limiterType, userId);
    if (!result.success && result.response) {
        return result.response;
    }
    return null;
}
//# sourceMappingURL=rate-limit.js.map