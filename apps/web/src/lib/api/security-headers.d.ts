/**
 * Security Headers - OWASP Best Practices
 *
 * Protects against:
 * - XSS (Cross-Site Scripting)
 * - Clickjacking
 * - MIME type sniffing
 * - Information disclosure
 * - Man-in-the-middle attacks
 *
 * Based on:
 * - OWASP Secure Headers Project
 * - Mozilla Observatory recommendations
 * - Security.txt best practices
 */
import { NextResponse } from 'next/server';
/**
 * Apply security headers to response
 * Call this for all API routes and pages
 */
export declare function applySecurityHeaders(response: NextResponse): NextResponse;
/**
 * Get security headers as a plain object
 * Useful for Next.js middleware or custom server
 */
export declare function getSecurityHeaders(): Record<string, string>;
/**
 * Check if response needs security headers applied
 * Skip for certain content types (e.g., images, fonts)
 */
export declare function shouldApplySecurityHeaders(response: NextResponse): boolean;
//# sourceMappingURL=security-headers.d.ts.map