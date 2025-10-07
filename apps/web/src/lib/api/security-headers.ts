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
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  // ============================================================================
  // Content Security Policy (CSP)
  // Prevents XSS attacks by controlling what resources can be loaded
  // ============================================================================
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net", // Next.js requires unsafe-inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://*.supabase.co https://*.anthropic.com",
    "frame-ancestors 'none'", // Prevent clickjacking
    "base-uri 'self'",
    "form-action 'self'",
  ];

  headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // ============================================================================
  // Strict Transport Security (HSTS)
  // Forces HTTPS for 1 year, includes subdomains
  // ============================================================================
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // ============================================================================
  // X-Frame-Options
  // Prevents clickjacking by disallowing embedding in iframes
  // ============================================================================
  headers.set('X-Frame-Options', 'DENY');

  // ============================================================================
  // X-Content-Type-Options
  // Prevents MIME type sniffing
  // ============================================================================
  headers.set('X-Content-Type-Options', 'nosniff');

  // ============================================================================
  // X-XSS-Protection
  // Legacy XSS protection (modern browsers use CSP)
  // ============================================================================
  headers.set('X-XSS-Protection', '1; mode=block');

  // ============================================================================
  // Referrer Policy
  // Controls how much referrer information is sent
  // ============================================================================
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // ============================================================================
  // Permissions Policy (formerly Feature Policy)
  // Controls which browser features can be used
  // ============================================================================
  const permissionsDirectives = [
    'camera=()',           // Disable camera
    'microphone=()',       // Disable microphone
    'geolocation=()',      // Disable geolocation
    'interest-cohort=()',  // Disable FLoC tracking
    'payment=()',          // Disable payment API (unless you use it)
  ];

  headers.set('Permissions-Policy', permissionsDirectives.join(', '));

  // ============================================================================
  // X-DNS-Prefetch-Control
  // Control DNS prefetching for privacy
  // ============================================================================
  headers.set('X-DNS-Prefetch-Control', 'on');

  // ============================================================================
  // X-Powered-By (Remove to hide tech stack)
  // ============================================================================
  headers.delete('X-Powered-By');

  // ============================================================================
  // Cross-Origin-Embedder-Policy
  // Prevents loading cross-origin resources
  // ============================================================================
  // headers.set('Cross-Origin-Embedder-Policy', 'require-corp'); // Can break images/fonts

  // ============================================================================
  // Cross-Origin-Opener-Policy
  // Isolates browsing context
  // ============================================================================
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  // ============================================================================
  // Cross-Origin-Resource-Policy
  // Protects against certain cross-origin attacks
  // ============================================================================
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

/**
 * Get security headers as a plain object
 * Useful for Next.js middleware or custom server
 */
export function getSecurityHeaders(): Record<string, string> {
  const response = new NextResponse();
  applySecurityHeaders(response);

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return headers;
}

/**
 * Check if response needs security headers applied
 * Skip for certain content types (e.g., images, fonts)
 */
export function shouldApplySecurityHeaders(response: NextResponse): boolean {
  const contentType = response.headers.get('content-type') || '';

  // Skip security headers for static assets
  const skipContentTypes = [
    'image/',
    'font/',
    'video/',
    'audio/',
  ];

  return !skipContentTypes.some((type) => contentType.startsWith(type));
}
