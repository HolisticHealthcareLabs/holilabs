"use strict";
/**
 * API Middleware Utilities
 * Industry-grade request handling, validation, and security
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.withErrorHandling = withErrorHandling;
exports.withCORS = withCORS;
exports.compose = compose;
exports.withAuditLog = withAuditLog;
exports.createProtectedRoute = createProtectedRoute;
exports.createPublicRoute = createPublicRoute;
const server_1 = require("next/server");
const server_2 = require("@/lib/supabase/server");
const prisma_1 = require("@/lib/prisma");
const zod_1 = require("zod");
const csrf_1 = require("@/lib/security/csrf");
const cors_1 = require("./cors");
const request_id_1 = require("@/lib/request-id");
const logger_1 = require("@/lib/logger");
const security_headers_1 = require("./security-headers");
const redis_1 = require("@upstash/redis");
// ============================================================================
// RATE LIMITING (Redis-backed with in-memory fallback)
// ============================================================================
// Initialize Redis client (only if credentials are available)
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new redis_1.Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger_1.logger.info({
        event: 'redis_client_init',
        enabled: true,
    }, 'Redis rate limiting enabled');
}
else {
    logger_1.logger.warn({
        event: 'redis_client_init',
        enabled: false,
        reason: 'Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN',
    }, 'Redis not configured - falling back to in-memory rate limiting');
}
// In-memory fallback (for development or when Redis is unavailable)
const rateLimitStore = new Map();
const MAX_STORE_SIZE = 10000;
// Cleanup for in-memory store
setInterval(() => {
    if (redis)
        return; // Skip if using Redis
    const now = Date.now();
    const entries = Array.from(rateLimitStore.entries());
    for (const [key, value] of entries) {
        if (now > value.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 60000);
function rateLimit(config) {
    return async (request, context, next) => {
        const identifier = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        // Hash the URL to keep keys short
        const urlHash = Buffer.from(request.url).toString('base64').slice(0, 20);
        const key = `ratelimit:${identifier}:${urlHash}`;
        const now = Date.now();
        const windowSeconds = Math.ceil(config.windowMs / 1000);
        const log = (0, logger_1.createLogger)({ requestId: context.requestId, identifier });
        // ========================================================================
        // REDIS IMPLEMENTATION (Production)
        // ========================================================================
        if (redis) {
            try {
                const count = await redis.incr(key);
                // Set expiration on first request
                if (count === 1) {
                    await redis.expire(key, windowSeconds);
                }
                const remaining = Math.max(0, config.maxRequests - count);
                const resetAt = now + (config.windowMs);
                if (count > config.maxRequests) {
                    const ttl = await redis.ttl(key);
                    const resetIn = ttl > 0 ? ttl : windowSeconds;
                    log.warn({
                        event: 'rate_limit_exceeded',
                        maxRequests: config.maxRequests,
                        currentCount: count,
                        resetIn,
                        url: request.url,
                        backend: 'redis',
                    }, 'Rate limit exceeded (Redis)');
                    return server_1.NextResponse.json({
                        error: 'Rate limit exceeded',
                        retryAfter: resetIn,
                    }, {
                        status: 429,
                        headers: {
                            'Retry-After': resetIn.toString(),
                            'X-RateLimit-Limit': config.maxRequests.toString(),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
                        },
                    });
                }
                const response = await next();
                response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
                response.headers.set('X-RateLimit-Remaining', remaining.toString());
                response.headers.set('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());
                return response;
            }
            catch (error) {
                log.error({
                    ...(0, logger_1.logError)(error),
                    event: 'redis_rate_limit_error',
                }, 'Redis rate limiting failed - falling back to in-memory');
                // Fall through to in-memory implementation
            }
        }
        // ========================================================================
        // IN-MEMORY FALLBACK (Development or Redis failure)
        // ========================================================================
        // Enforce max store size
        if (rateLimitStore.size > MAX_STORE_SIZE) {
            const entries = Array.from(rateLimitStore.entries())
                .sort((a, b) => a[1].resetAt - b[1].resetAt)
                .slice(0, 1000);
            entries.forEach(([k]) => rateLimitStore.delete(k));
        }
        const record = rateLimitStore.get(key);
        // Clean up expired records
        if (record && now > record.resetAt) {
            rateLimitStore.delete(key);
        }
        const current = rateLimitStore.get(key);
        if (!current) {
            rateLimitStore.set(key, {
                count: 1,
                resetAt: now + config.windowMs,
            });
            return next();
        }
        if (current.count >= config.maxRequests) {
            const resetIn = Math.ceil((current.resetAt - now) / 1000);
            log.warn({
                event: 'rate_limit_exceeded',
                maxRequests: config.maxRequests,
                resetIn,
                url: request.url,
                backend: 'in-memory',
            }, 'Rate limit exceeded (in-memory)');
            return server_1.NextResponse.json({
                error: 'Rate limit exceeded',
                retryAfter: resetIn,
            }, {
                status: 429,
                headers: {
                    'Retry-After': resetIn.toString(),
                    'X-RateLimit-Limit': config.maxRequests.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': current.resetAt.toString(),
                },
            });
        }
        current.count++;
        rateLimitStore.set(key, current);
        const response = await next();
        response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', (config.maxRequests - current.count).toString());
        response.headers.set('X-RateLimit-Reset', current.resetAt.toString());
        return response;
    };
}
// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
function requireAuth() {
    return async (request, context, next) => {
        try {
            // Skip authentication in test environment
            if (process.env.NODE_ENV === 'test') {
                context.user = {
                    id: 'test-user-id',
                    email: 'test@example.com',
                    role: 'CLINICIAN',
                };
                return next();
            }
            const supabase = (0, server_2.createClient)();
            const { data: { user }, error, } = await supabase.auth.getUser();
            if (error || !user) {
                return server_1.NextResponse.json({ error: 'Unauthorized - Please login' }, { status: 401 });
            }
            // Fetch user from database with role
            const dbUser = await prisma_1.prisma.user.findUnique({
                where: { supabaseId: user.id },
                select: { id: true, email: true, role: true },
            });
            if (!dbUser) {
                return server_1.NextResponse.json({ error: 'User not found in database' }, { status: 404 });
            }
            // Attach user to context
            context.user = {
                id: dbUser.id,
                email: dbUser.email,
                role: dbUser.role,
            };
            return next();
        }
        catch (error) {
            const log = (0, logger_1.createLogger)({ requestId: context.requestId });
            log.error((0, logger_1.logError)(error), 'Authentication middleware error');
            return server_1.NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
        }
    };
}
function requireRole(...allowedRoles) {
    return async (request, context, next) => {
        if (!context.user) {
            return server_1.NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (!allowedRoles.includes(context.user.role)) {
            return server_1.NextResponse.json({
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: context.user.role,
            }, { status: 403 });
        }
        return next();
    };
}
// ============================================================================
// REQUEST VALIDATION
// ============================================================================
function validateBody(schema) {
    return async (request, context, next) => {
        try {
            const body = await request.json();
            const validated = schema.parse(body);
            // Attach validated data to context
            context.validatedBody = validated;
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return server_1.NextResponse.json({
                    error: 'Validation failed',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                }, { status: 400 });
            }
            return server_1.NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }
    };
}
function validateQuery(schema) {
    return async (request, context, next) => {
        try {
            const { searchParams } = new URL(request.url);
            const query = Object.fromEntries(searchParams.entries());
            const validated = schema.parse(query);
            // Attach validated data to context
            context.validatedQuery = validated;
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return server_1.NextResponse.json({
                    error: 'Query validation failed',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                }, { status: 400 });
            }
            return server_1.NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
        }
    };
}
// ============================================================================
// ERROR HANDLING
// ============================================================================
function withErrorHandling(handler) {
    return async (request, context) => {
        const startTime = Date.now();
        const log = (0, logger_1.createLogger)({
            requestId: context.requestId,
            method: request.method,
            url: request.url,
        });
        try {
            log.info('API request started');
            const response = await handler(request, context);
            const duration = Date.now() - startTime;
            log.info({
                event: 'api_request_completed',
                status: response.status,
                duration,
            }, 'API request completed');
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            log.error({
                ...(0, logger_1.logError)(error),
                event: 'api_error',
                duration,
                errorCode: error.code,
            }, 'API request failed');
            // Prisma errors
            if (error.code === 'P2002') {
                return server_1.NextResponse.json({ error: 'A record with this value already exists' }, { status: 409 });
            }
            if (error.code === 'P2025') {
                return server_1.NextResponse.json({ error: 'Record not found' }, { status: 404 });
            }
            // Generic error
            return server_1.NextResponse.json({
                error: process.env.NODE_ENV === 'production'
                    ? 'Internal server error'
                    : error.message,
            }, { status: 500 });
        }
    };
}
// ============================================================================
// CORS HEADERS
// ============================================================================
function withCORS(response, allowedOrigins = ['*']) {
    const origin = allowedOrigins.includes('*') ? '*' : allowedOrigins.join(',');
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
}
function compose(...middlewares) {
    return (handler) => {
        return async (request, context) => {
            let index = 0;
            const next = async () => {
                if (index < middlewares.length) {
                    const middleware = middlewares[index++];
                    return middleware(request, context, next);
                }
                return handler(request, context);
            };
            return next();
        };
    };
}
// ============================================================================
// AUDIT LOGGING
// ============================================================================
function withAuditLog(action, resource) {
    return async (request, context, next) => {
        const start = Date.now();
        const response = await next();
        const duration = Date.now() - start;
        // Log async (don't block response)
        (async () => {
            const log = (0, logger_1.createLogger)({ requestId: context.requestId, userId: context.user?.id });
            try {
                await prisma_1.prisma.auditLog.create({
                    data: {
                        userId: context.user?.id,
                        userEmail: context.user?.email || 'anonymous',
                        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
                        action: action, // Cast to avoid type error with string
                        resource,
                        resourceId: context.params?.id || 'N/A',
                        success: response.status < 400,
                        details: {
                            method: request.method,
                            url: request.url,
                            duration,
                            statusCode: response.status,
                        },
                    },
                });
                log.info({
                    event: 'audit_log_created',
                    action,
                    resource,
                    success: response.status < 400,
                }, 'Audit log created');
            }
            catch (error) {
                log.error((0, logger_1.logError)(error), 'Failed to create audit log');
            }
        })();
        return response;
    };
}
// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================
/**
 * Create a protected API route with authentication, rate limiting, CSRF protection, and error handling
 */
function createProtectedRoute(handler, options) {
    return async (request, context) => {
        // Generate or extract request ID
        const requestId = (0, request_id_1.getOrCreateRequestId)(request.headers);
        context.requestId = requestId;
        // Handle CORS preflight
        const preflightResponse = (0, cors_1.handlePreflight)(request);
        if (preflightResponse) {
            preflightResponse.headers.set(request_id_1.REQUEST_ID_HEADER, requestId);
            return preflightResponse;
        }
        const middlewares = [requireAuth()];
        // Add CSRF protection by default for all protected routes (skip only if explicitly disabled)
        if (!options?.skipCsrf) {
            middlewares.push((0, csrf_1.csrfProtection)());
        }
        if (options?.rateLimit) {
            middlewares.push(rateLimit(options.rateLimit));
        }
        if (options?.roles) {
            middlewares.push(requireRole(...options.roles));
        }
        if (options?.audit) {
            middlewares.push(withAuditLog(options.audit.action, options.audit.resource));
        }
        const composedHandler = withErrorHandling(compose(...middlewares)(handler));
        let response = await composedHandler(request, context);
        // Apply request ID, CORS, and security headers to response
        response.headers.set(request_id_1.REQUEST_ID_HEADER, requestId);
        response = (0, cors_1.applyCorsHeaders)(request, response);
        response = (0, security_headers_1.applySecurityHeaders)(response);
        return response;
    };
}
/**
 * Create a public API route with rate limiting and error handling
 */
function createPublicRoute(handler, options) {
    return async (request, context) => {
        // Generate or extract request ID
        const requestId = (0, request_id_1.getOrCreateRequestId)(request.headers);
        context.requestId = requestId;
        // Handle CORS preflight
        const preflightResponse = (0, cors_1.handlePreflight)(request);
        if (preflightResponse) {
            preflightResponse.headers.set(request_id_1.REQUEST_ID_HEADER, requestId);
            return preflightResponse;
        }
        const middlewares = [];
        if (options?.rateLimit) {
            middlewares.push(rateLimit(options.rateLimit));
        }
        const composedHandler = withErrorHandling(compose(...middlewares)(handler));
        let response = await composedHandler(request, context);
        // Apply request ID, CORS, and security headers to response
        response.headers.set(request_id_1.REQUEST_ID_HEADER, requestId);
        response = (0, cors_1.applyCorsHeaders)(request, response);
        response = (0, security_headers_1.applySecurityHeaders)(response);
        return response;
    };
}
//# sourceMappingURL=middleware.js.map