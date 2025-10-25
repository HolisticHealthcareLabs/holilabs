/**
 * Rate Limiting Utility
 *
 * Protects API endpoints from abuse using Upstash Redis
 */
import { Ratelimit } from '@upstash/ratelimit';
import { NextRequest, NextResponse } from 'next/server';
/**
 * Rate limit configurations for different endpoint types
 */
export declare const rateLimiters: {
    auth: Ratelimit | null;
    upload: Ratelimit | null;
    messages: Ratelimit | null;
    api: Ratelimit | null;
    search: Ratelimit | null;
};
/**
 * Apply rate limiting to a request
 */
export declare function applyRateLimit(request: NextRequest, limiterType: keyof typeof rateLimiters, userId?: string): Promise<{
    success: boolean;
    response?: NextResponse;
}>;
/**
 * Rate limit middleware for API routes
 * Usage: export const middleware = withRateLimit('api');
 */
export declare function withRateLimit(limiterType: keyof typeof rateLimiters): (request: NextRequest) => Promise<NextResponse<unknown>>;
/**
 * Manual rate limit check for use in API route handlers
 */
export declare function checkRateLimit(request: NextRequest, limiterType: keyof typeof rateLimiters, userId?: string): Promise<NextResponse | null>;
//# sourceMappingURL=rate-limit.d.ts.map