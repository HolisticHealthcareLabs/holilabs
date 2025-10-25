"use strict";
/**
 * CSRF Protection Utilities
 *
 * Implements CSRF token generation and validation
 * Uses double-submit cookie pattern
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCSRFToken = generateCSRFToken;
exports.getCSRFToken = getCSRFToken;
exports.validateCSRFToken = validateCSRFToken;
exports.csrfProtection = csrfProtection;
exports.getCSRFTokenForForm = getCSRFTokenForForm;
exports.getCSRFTokenFromCookie = getCSRFTokenFromCookie;
exports.withCSRFToken = withCSRFToken;
const server_1 = require("next/server");
const crypto_1 = __importDefault(require("crypto"));
const headers_1 = require("next/headers");
const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
/**
 * Generate a random CSRF token
 */
function generateCSRFToken() {
    return crypto_1.default.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}
/**
 * Get or create CSRF token for the session
 */
async function getCSRFToken() {
    const cookieStore = await (0, headers_1.cookies)();
    const existingToken = cookieStore.get(CSRF_COOKIE_NAME);
    if (existingToken && existingToken.value) {
        return existingToken.value;
    }
    // Generate new token
    const newToken = generateCSRFToken();
    // Set cookie (will be picked up by the response)
    cookieStore.set(CSRF_COOKIE_NAME, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });
    return newToken;
}
/**
 * Validate CSRF token from request
 */
async function validateCSRFToken(request) {
    // Get token from cookie
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    // Get token from header
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    // Both must exist and match
    if (!cookieToken || !headerToken) {
        return false;
    }
    // Constant-time comparison to prevent timing attacks
    return crypto_1.default.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}
/**
 * Middleware to validate CSRF token
 */
async function csrfProtection(request) {
    // Only check POST, PUT, PATCH, DELETE requests
    const method = request.method.toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return null; // Allow request
    }
    // Skip CSRF check for API routes that don't need it
    // (e.g., webhook endpoints, public APIs)
    const pathname = request.nextUrl.pathname;
    const skipPaths = [
        '/api/webhooks/',
        '/api/public/',
    ];
    if (skipPaths.some(path => pathname.startsWith(path))) {
        return null; // Allow request
    }
    // Validate CSRF token
    const isValid = await validateCSRFToken(request);
    if (!isValid) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Invalid CSRF token. Please refresh the page and try again.',
        }, { status: 403 });
    }
    return null; // Allow request
}
/**
 * Generate CSRF token for forms
 * Usage in React Server Components:
 *
 * const csrfToken = await getCSRFToken();
 * <form>
 *   <input type="hidden" name="csrf_token" value={csrfToken} />
 * </form>
 */
async function getCSRFTokenForForm() {
    return await getCSRFToken();
}
/**
 * Client-side helper to get CSRF token from cookie
 * For use in client components
 */
function getCSRFTokenFromCookie() {
    if (typeof document === 'undefined') {
        return null;
    }
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(cookie => cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`));
    if (!csrfCookie) {
        return null;
    }
    return csrfCookie.split('=')[1];
}
/**
 * Helper to add CSRF token to fetch requests
 */
function withCSRFToken(options = {}) {
    const token = getCSRFTokenFromCookie();
    if (!token) {
        console.warn('CSRF token not found in cookies');
        return options;
    }
    return {
        ...options,
        headers: {
            ...options.headers,
            [CSRF_HEADER_NAME]: token,
        },
    };
}
//# sourceMappingURL=csrf.js.map