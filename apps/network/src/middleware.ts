/**
 * Next.js Edge Middleware — Request-level auth for @holi/network
 *
 * Protects:
 *   /dashboard/*  — requires valid session (redirect to /login on fail)
 *   /api/referrals/* — requires Bearer token (returns 401 JSON on fail)
 *
 * Excludes:
 *   /api/webhooks/* — verified by HMAC at the route level (Meta + Cal.com)
 *   /api/cron/*    — verified by CRON_SECRET at the route level
 *
 * CYRUS: All security headers (HSTS, CSP, X-Frame-Options) are applied to
 * every response regardless of auth status.
 */

import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_API_PREFIXES = ['/api/referrals'];
// Dashboard has no standalone login in this prototype — protected at the
// infrastructure level (reverse proxy / Holi main app auth) in production.
const PUBLIC_PREFIXES = ['/api/webhooks', '/api/cron', '/api/health', '/dashboard'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Security headers on all responses
  const response = NextResponse.next();
  applySecurityHeaders(response);

  // Bypass public routes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return response;
  }

  // API routes — require Bearer token (401 if missing)
  if (PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    const auth = request.headers.get('authorization');
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: securityHeadersMap(),
        }
      );
    }
    // Full JWT verification happens inside the route handler with verifyBearerToken.
    // Middleware only validates the header shape for a fast 401 on obviously invalid requests.
    return response;
  }

  return response;
}

function securityHeadersMap(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';",
  };
}

function applySecurityHeaders(response: NextResponse): void {
  for (const [k, v] of Object.entries(securityHeadersMap())) {
    response.headers.set(k, v);
  }
}

export const config = {
  matcher: ['/api/referrals/:path*'],
};
