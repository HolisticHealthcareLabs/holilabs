"use strict";
/**
 * CORS Configuration - Industry-Grade
 *
 * Security Features:
 * - Whitelist specific origins only (never use '*' in production)
 * - Protects against CSRF and XSS attacks
 * - Strict security headers
 * - Configurable via environment variables
 *
 * OWASP Best Practices:
 * - Never use wildcard (*) in production
 * - Always validate origin header
 * - Use credentials only with specific origins
 * - Set appropriate cache times for preflight
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHeaders = corsHeaders;
exports.handlePreflight = handlePreflight;
exports.applyCorsHeaders = applyCorsHeaders;
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
/**
 * Allowed origins - UPDATE THIS LIST with your actual domains
 * Add multiple origins for staging, production, custom domains
 */
const ALLOWED_ORIGINS = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://holilabs-lwp6y.ondigitalocean.app', // DigitalOcean app URL
    // Add your custom domains here:
    // 'https://holilabs.io',
    // 'https://www.holilabs.io',
    // 'https://app.holilabs.io',
];
/**
 * Get allowed origins based on environment
 * Removes localhost in production for security
 */
const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        const origins = ALLOWED_ORIGINS.filter((origin) => !origin.includes('localhost'));
        // Log allowed origins on startup (once)
        if (!global.__corsOriginsLogged) {
            logger_1.logger.info({
                event: 'cors_config',
                allowedOrigins: origins.length,
            }, 'CORS allowed origins configured');
            global.__corsOriginsLogged = true;
        }
        return origins;
    }
    return ALLOWED_ORIGINS;
};
/**
 * CORS Middleware
 * Add to any API route that should accept cross-origin requests
 */
function corsHeaders(request) {
    const origin = request.headers.get('origin');
    const allowedOrigins = getAllowedOrigins();
    const headers = new Headers();
    // Only allow whitelisted origins
    if (origin && allowedOrigins.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        // Log blocked origins in production (potential security issue)
    }
    else if (origin && process.env.NODE_ENV === 'production') {
        logger_1.logger.warn({
            event: 'cors_origin_blocked',
            origin,
            allowedOrigins: allowedOrigins.length,
            requestUrl: request.url,
        }, 'Blocked cross-origin request from unauthorized origin');
    }
    else if (allowedOrigins.length === 1) {
        // If only one origin, allow it (common for single-domain apps)
        headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
    // Standard CORS headers
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Max-Age', '86400'); // 24 hours preflight cache
    return headers;
}
/**
 * Handle OPTIONS preflight requests
 */
function handlePreflight(request) {
    if (request.method === 'OPTIONS') {
        return new server_1.NextResponse(null, {
            status: 204,
            headers: corsHeaders(request),
        });
    }
    return null;
}
/**
 * Apply CORS headers to response
 */
function applyCorsHeaders(request, response) {
    const headers = corsHeaders(request);
    headers.forEach((value, key) => {
        response.headers.set(key, value);
    });
    return response;
}
//# sourceMappingURL=cors.js.map