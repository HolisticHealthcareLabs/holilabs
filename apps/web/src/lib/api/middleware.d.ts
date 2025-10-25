/**
 * API Middleware Utilities
 * Industry-grade request handling, validation, and security
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
export type ApiHandler = (request: NextRequest, context: ApiContext) => Promise<NextResponse> | NextResponse;
export interface ApiContext {
    params?: Record<string, string>;
    requestId?: string;
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export declare function rateLimit(config: RateLimitConfig): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
export declare function requireAuth(): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
export type UserRole = 'ADMIN' | 'CLINICIAN' | 'NURSE' | 'STAFF';
export declare function requireRole(...allowedRoles: UserRole[]): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
export declare function validateBody<T extends z.ZodType>(schema: T): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
export declare function validateQuery<T extends z.ZodType>(schema: T): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
export declare function withErrorHandling(handler: ApiHandler): (request: NextRequest, context: ApiContext) => Promise<NextResponse<unknown>>;
export declare function withCORS(response: NextResponse, allowedOrigins?: string[]): NextResponse<unknown>;
type Middleware = (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse>;
export declare function compose(...middlewares: Middleware[]): (handler: ApiHandler) => ApiHandler;
export declare function withAuditLog(action: string, resource: string): (request: NextRequest, context: ApiContext, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
/**
 * Create a protected API route with authentication, rate limiting, CSRF protection, and error handling
 */
export declare function createProtectedRoute(handler: ApiHandler, options?: {
    roles?: UserRole[];
    rateLimit?: RateLimitConfig;
    audit?: {
        action: string;
        resource: string;
    };
    skipCsrf?: boolean;
}): (request: NextRequest, context: ApiContext) => Promise<NextResponse<unknown>>;
/**
 * Create a public API route with rate limiting and error handling
 */
export declare function createPublicRoute(handler: ApiHandler, options?: {
    rateLimit?: RateLimitConfig;
}): (request: NextRequest, context: ApiContext) => Promise<NextResponse<unknown>>;
export {};
//# sourceMappingURL=middleware.d.ts.map