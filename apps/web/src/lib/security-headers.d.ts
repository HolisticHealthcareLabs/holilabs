/**
 * Security Headers Configuration
 *
 * Production-grade security headers for HIPAA compliance
 */
import { NextResponse } from 'next/server';
/**
 * Apply security headers to a response
 */
export declare function applySecurityHeaders(response: NextResponse): NextResponse;
/**
 * Handle OPTIONS preflight requests
 */
export declare function handleCORSPreflight(): NextResponse;
//# sourceMappingURL=security-headers.d.ts.map