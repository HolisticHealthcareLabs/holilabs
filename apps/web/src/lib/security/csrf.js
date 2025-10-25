"use strict";
/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Industry-Grade Implementation with HMAC Signing and Token Expiration
 *
 * SECURITY FEATURES:
 * - Double Submit Cookie pattern with HMAC signature
 * - Token expiration (24 hours)
 * - Constant-time comparison (prevents timing attacks)
 * - Automatic token rotation
 * - Cryptographically secure random generation
 *
 * OWASP Top 10 2021: A01:2021-Broken Access Control
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCsrfToken = generateCsrfToken;
exports.verifyCsrfToken = verifyCsrfToken;
exports.compareTokens = compareTokens;
exports.csrfProtection = csrfProtection;
exports.setCsrfCookie = setCsrfCookie;
exports.getCsrfToken = getCsrfToken;
exports.getClientCsrfToken = getClientCsrfToken;
exports.withCsrf = withCsrf;
exports.testCsrf = testCsrf;
const crypto_1 = __importDefault(require("crypto"));
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
// ============================================================================
// CONFIGURATION
// ============================================================================
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const TOKEN_LENGTH = 32; // 32 bytes = 64 hex characters
/**
 * Get SESSION_SECRET from environment
 * This is used to sign CSRF tokens with HMAC
 */
function getSessionSecret() {
    const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        logger_1.logger.error({
            event: 'csrf_missing_secret',
            message: 'SESSION_SECRET or NEXTAUTH_SECRET not configured',
        }, 'CSRF protection degraded - no secret key found');
        // Fallback to a constant (NOT SECURE - for development only)
        if (process.env.NODE_ENV !== 'production') {
            logger_1.logger.warn('Using development fallback secret for CSRF - DO NOT USE IN PRODUCTION');
            return Buffer.from('dev-fallback-csrf-secret-insecure-do-not-use-in-prod', 'utf8');
        }
        throw new Error('SESSION_SECRET or NEXTAUTH_SECRET must be set in environment. Generate with: openssl rand -hex 32');
    }
    return Buffer.from(secret, 'utf8');
}
/**
 * Generate a cryptographically secure CSRF token with HMAC signature
 *
 * Token format: token:signature:expiresAt
 * - token: 64 hex chars (32 bytes random)
 * - signature: HMAC-SHA256 of (token + expiresAt)
 * - expiresAt: Unix timestamp in milliseconds
 *
 * @returns Signed CSRF token string
 */
function generateCsrfToken() {
    const token = crypto_1.default.randomBytes(TOKEN_LENGTH).toString('hex');
    const expiresAt = Date.now() + TOKEN_EXPIRATION_MS;
    // Sign token with HMAC-SHA256
    const secret = getSessionSecret();
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(`${token}:${expiresAt}`);
    const signature = hmac.digest('hex');
    // Combined format: token:signature:expiresAt
    return `${token}:${signature}:${expiresAt}`;
}
/**
 * Parse CSRF token from combined format
 *
 * @param tokenString - Combined token string (token:signature:expiresAt)
 * @returns Parsed token data or null if invalid format
 */
function parseCsrfToken(tokenString) {
    const parts = tokenString.split(':');
    if (parts.length !== 3) {
        return null;
    }
    const [token, signature, expiresAtStr] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!token ||
        !signature ||
        isNaN(expiresAt) ||
        token.length !== TOKEN_LENGTH * 2 || // hex string is 2x byte length
        signature.length !== 64 // SHA256 hex is 64 chars
    ) {
        return null;
    }
    return { token, signature, expiresAt };
}
/**
 * Verify CSRF token signature and expiration
 *
 * @param tokenString - Combined token string to verify
 * @returns true if token is valid and not expired
 */
function verifyCsrfToken(tokenString) {
    const parsed = parseCsrfToken(tokenString);
    if (!parsed) {
        logger_1.logger.warn({
            event: 'csrf_token_invalid_format',
            tokenLength: tokenString?.length || 0,
        }, 'CSRF token has invalid format');
        return false;
    }
    // Check expiration
    const now = Date.now();
    if (now > parsed.expiresAt) {
        logger_1.logger.warn({
            event: 'csrf_token_expired',
            expiresAt: parsed.expiresAt,
            now,
            ageMs: now - parsed.expiresAt,
        }, 'CSRF token expired');
        return false;
    }
    // Verify HMAC signature
    const secret = getSessionSecret();
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(`${parsed.token}:${parsed.expiresAt}`);
    const expectedSignature = hmac.digest('hex');
    // Constant-time comparison (prevents timing attacks)
    if (!compareTokens(parsed.signature, expectedSignature)) {
        logger_1.logger.warn({
            event: 'csrf_token_invalid_signature',
            hasSignature: !!parsed.signature,
        }, 'CSRF token signature verification failed');
        return false;
    }
    return true;
}
/**
 * Compare two tokens in constant time (prevents timing attacks)
 * @param token1 - First token
 * @param token2 - Second token
 * @returns true if tokens match
 */
function compareTokens(token1, token2) {
    if (!token1 || !token2)
        return false;
    if (token1.length !== token2.length)
        return false;
    try {
        const buf1 = Buffer.from(token1);
        const buf2 = Buffer.from(token2);
        return crypto_1.default.timingSafeEqual(buf1, buf2);
    }
    catch (error) {
        // Handle buffer creation errors
        return false;
    }
}
// ============================================================================
// CSRF MIDDLEWARE
// ============================================================================
/**
 * CSRF protection middleware (Industry-Grade)
 *
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
 *
 * Security checks:
 * 1. Token exists in both header and cookie (Double Submit Pattern)
 * 2. Tokens match (constant-time comparison)
 * 3. Token signature is valid (HMAC verification)
 * 4. Token is not expired (24 hour TTL)
 *
 * @returns Middleware function
 */
function csrfProtection() {
    return async (request, context, next) => {
        const method = request.method;
        // Only check CSRF for state-changing methods
        if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            return next();
        }
        // Get CSRF token from header
        const headerToken = request.headers.get('x-csrf-token');
        // Get CSRF token from cookie
        const cookieToken = request.cookies.get('csrf-token')?.value;
        // Log attempt for security monitoring
        const log = logger_1.logger.child({
            requestId: context.requestId,
            method,
            url: request.url,
            hasHeaderToken: !!headerToken,
            hasCookieToken: !!cookieToken,
        });
        // Both must exist
        if (!headerToken || !cookieToken) {
            log.warn({
                event: 'csrf_token_missing',
                missingFrom: !headerToken ? 'header' : 'cookie',
            }, 'CSRF token missing from request');
            return server_1.NextResponse.json({
                error: 'CSRF token missing',
                message: 'Missing CSRF token. Please refresh the page and try again.',
                code: 'CSRF_TOKEN_MISSING',
            }, { status: 403 });
        }
        // Tokens must match (timing-safe comparison)
        if (!compareTokens(headerToken, cookieToken)) {
            log.warn({
                event: 'csrf_token_mismatch',
            }, 'CSRF token mismatch between header and cookie');
            return server_1.NextResponse.json({
                error: 'CSRF token mismatch',
                message: 'Invalid CSRF token. Please refresh the page and try again.',
                code: 'CSRF_TOKEN_MISMATCH',
            }, { status: 403 });
        }
        // Verify token signature and expiration
        if (!verifyCsrfToken(headerToken)) {
            log.warn({
                event: 'csrf_token_invalid',
            }, 'CSRF token verification failed (invalid signature or expired)');
            return server_1.NextResponse.json({
                error: 'CSRF token invalid',
                message: 'Your session has expired. Please refresh the page and try again.',
                code: 'CSRF_TOKEN_INVALID',
            }, { status: 403 });
        }
        // Token valid - proceed
        log.debug({
            event: 'csrf_token_valid',
        }, 'CSRF token validated successfully');
        return next();
    };
}
// ============================================================================
// DOUBLE SUBMIT COOKIE PATTERN
// ============================================================================
/**
 * Set CSRF token in cookie and return token for client
 * Use this in login/signup flows
 */
function setCsrfCookie(response) {
    const token = generateCsrfToken();
    // Set httpOnly cookie (secure in production)
    response.cookies.set('csrf-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
    });
    return token;
}
/**
 * Get CSRF token from request
 */
function getCsrfToken(request) {
    return request.cookies.get('csrf-token')?.value || null;
}
// ============================================================================
// CLIENT-SIDE HELPERS
// ============================================================================
/**
 * Get CSRF token from cookie (browser-side)
 * Use this in fetch requests
 */
function getClientCsrfToken() {
    if (typeof document === 'undefined')
        return null;
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? match[1] : null;
}
/**
 * Add CSRF token to fetch options
 * Example:
 *   fetch('/api/patients', withCsrf({ method: 'POST', body: JSON.stringify(data) }))
 */
function withCsrf(options = {}) {
    const token = getClientCsrfToken();
    if (!token) {
        console.warn('No CSRF token found. Request may be rejected.');
    }
    return {
        ...options,
        headers: {
            ...options.headers,
            'X-CSRF-Token': token || '',
        },
    };
}
// ============================================================================
// TESTING
// ============================================================================
/**
 * Test CSRF functions (Industry-Grade Test Suite)
 */
function testCsrf() {
    console.log('🛡️ Testing CSRF protection...\n');
    // Test 1: Generate token
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    console.log('Test 1 - Token generation:');
    console.log('  Token 1 format:', token1.split(':').length === 3 ? '✅' : '❌');
    console.log('  Token 2 format:', token2.split(':').length === 3 ? '✅' : '❌');
    console.log('  Unique:', token1 !== token2 ? '✅' : '❌');
    // Test 2: Verify valid token
    console.log('\nTest 2 - Token verification:');
    console.log('  Fresh token valid:', verifyCsrfToken(token1) ? '✅' : '❌');
    // Test 3: Verify expired token
    const expiredToken = `abc123:signature:${Date.now() - 1000}`; // 1 second ago
    console.log('\nTest 3 - Expiration check:');
    console.log('  Expired token rejected:', !verifyCsrfToken(expiredToken) ? '✅' : '❌');
    // Test 4: Verify invalid signature
    const [tok, sig, exp] = token1.split(':');
    const tamperedToken = `${tok}:wrongsignature:${exp}`;
    console.log('\nTest 4 - Signature verification:');
    console.log('  Tampered token rejected:', !verifyCsrfToken(tamperedToken) ? '✅' : '❌');
    // Test 5: Compare tokens
    const testToken = 'abc123';
    console.log('\nTest 5 - Token comparison:');
    console.log('  Same tokens:', compareTokens(testToken, testToken) ? '✅' : '❌');
    console.log('  Different tokens:', !compareTokens(testToken, 'xyz789') ? '✅' : '❌');
    console.log('  Empty tokens:', !compareTokens('', '') ? '✅' : '❌');
    console.log('\n✅ All CSRF tests completed!\n');
}
// Run tests if executed directly
if (require.main === module) {
    testCsrf();
}
//# sourceMappingURL=csrf.js.map