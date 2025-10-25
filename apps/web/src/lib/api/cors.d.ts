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
import { NextRequest, NextResponse } from 'next/server';
/**
 * CORS Middleware
 * Add to any API route that should accept cross-origin requests
 */
export declare function corsHeaders(request: NextRequest): Headers;
/**
 * Handle OPTIONS preflight requests
 */
export declare function handlePreflight(request: NextRequest): NextResponse | null;
/**
 * Apply CORS headers to response
 */
export declare function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse;
//# sourceMappingURL=cors.d.ts.map