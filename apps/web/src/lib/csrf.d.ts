/**
 * CSRF Protection Utilities
 *
 * Implements CSRF token generation and validation
 * Uses double-submit cookie pattern
 */
import { NextRequest, NextResponse } from 'next/server';
/**
 * Generate a random CSRF token
 */
export declare function generateCSRFToken(): string;
/**
 * Get or create CSRF token for the session
 */
export declare function getCSRFToken(): Promise<string>;
/**
 * Validate CSRF token from request
 */
export declare function validateCSRFToken(request: NextRequest): Promise<boolean>;
/**
 * Middleware to validate CSRF token
 */
export declare function csrfProtection(request: NextRequest): Promise<NextResponse | null>;
/**
 * Generate CSRF token for forms
 * Usage in React Server Components:
 *
 * const csrfToken = await getCSRFToken();
 * <form>
 *   <input type="hidden" name="csrf_token" value={csrfToken} />
 * </form>
 */
export declare function getCSRFTokenForForm(): Promise<string>;
/**
 * Client-side helper to get CSRF token from cookie
 * For use in client components
 */
export declare function getCSRFTokenFromCookie(): string | null;
/**
 * Helper to add CSRF token to fetch requests
 */
export declare function withCSRFToken(options?: RequestInit): RequestInit;
//# sourceMappingURL=csrf.d.ts.map