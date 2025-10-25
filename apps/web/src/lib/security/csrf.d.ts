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
import { NextRequest, NextResponse } from 'next/server';
export interface CsrfTokenData {
    token: string;
    signature: string;
    expiresAt: number;
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
export declare function generateCsrfToken(): string;
/**
 * Verify CSRF token signature and expiration
 *
 * @param tokenString - Combined token string to verify
 * @returns true if token is valid and not expired
 */
export declare function verifyCsrfToken(tokenString: string): boolean;
/**
 * Compare two tokens in constant time (prevents timing attacks)
 * @param token1 - First token
 * @param token2 - Second token
 * @returns true if tokens match
 */
export declare function compareTokens(token1: string, token2: string): boolean;
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
export declare function csrfProtection(): (request: NextRequest, context: any, next: () => Promise<NextResponse>) => Promise<NextResponse<unknown>>;
/**
 * Set CSRF token in cookie and return token for client
 * Use this in login/signup flows
 */
export declare function setCsrfCookie(response: NextResponse): string;
/**
 * Get CSRF token from request
 */
export declare function getCsrfToken(request: NextRequest): string | null;
/**
 * Get CSRF token from cookie (browser-side)
 * Use this in fetch requests
 */
export declare function getClientCsrfToken(): string | null;
/**
 * Add CSRF token to fetch options
 * Example:
 *   fetch('/api/patients', withCsrf({ method: 'POST', body: JSON.stringify(data) }))
 */
export declare function withCsrf(options?: RequestInit): RequestInit;
/**
 * Test CSRF functions (Industry-Grade Test Suite)
 */
export declare function testCsrf(): void;
//# sourceMappingURL=csrf.d.ts.map