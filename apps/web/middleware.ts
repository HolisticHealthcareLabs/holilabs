/**
 * NextAuth v5 Middleware with Security Headers
 *
 * Protects portal routes, handles authentication, and applies security headers
 */

import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';
import { verifyCsrfToken } from '@/lib/security/csrf';
import { logger } from '@/lib/logger';

/**
 * Main middleware function
 * Applies security headers, CSRF protection, and authentication
 */
export default auth(async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  // Get authentication session
  const session = (request as any).auth;

  // CSRF Protection for state-changing methods on API routes
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  ) {
    // Exempt certain endpoints from CSRF validation
    const csrfExemptPaths = [
      '/api/auth/',
      '/api/health/',
      '/api/cron/',
      '/api/webhooks/',
      '/api/csrf',
    ];

    const isExempt = csrfExemptPaths.some((path) =>
      request.nextUrl.pathname.startsWith(path)
    );

    if (!isExempt) {
      const headerToken = request.headers.get('x-csrf-token');
      const cookieToken = request.cookies.get('csrf-token')?.value;

      if (!headerToken || !cookieToken) {
        logger.warn({
          event: 'csrf_token_missing',
          path: request.nextUrl.pathname,
          method: request.method,
          hasHeaderToken: !!headerToken,
          hasCookieToken: !!cookieToken,
        });

        return NextResponse.json(
          {
            error: 'CSRF token missing',
            message: 'Missing CSRF token. Please refresh the page and try again.',
            code: 'CSRF_TOKEN_MISSING',
          },
          { status: 403 }
        );
      }

      // Verify tokens match and are valid
      if (headerToken !== cookieToken || !verifyCsrfToken(headerToken)) {
        logger.warn({
          event: 'csrf_validation_failed',
          path: request.nextUrl.pathname,
          method: request.method,
        });

        return NextResponse.json(
          {
            error: 'CSRF token invalid',
            message: 'Invalid CSRF token. Please refresh the page and try again.',
            code: 'CSRF_TOKEN_INVALID',
          },
          { status: 403 }
        );
      }
    }
  }

  // Portal route protection
  if (request.nextUrl.pathname.startsWith('/portal/')) {
    const isLoginPage = request.nextUrl.pathname.startsWith('/portal/login');
    const isRegisterPage = request.nextUrl.pathname.startsWith('/portal/register');
    const isPublicPage = isLoginPage || isRegisterPage ||
                          request.nextUrl.pathname.startsWith('/portal/error') ||
                          request.nextUrl.pathname.startsWith('/portal/verify-email');

    // Redirect to login if not authenticated and trying to access protected portal route
    if (!session && !isPublicPage) {
      const signInUrl = new URL('/portal/login', request.url);
      signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Redirect to dashboard if authenticated and trying to access login/register
    if (session && (isLoginPage || isRegisterPage)) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  }

  // Continue with response and apply security headers
  const response = NextResponse.next();
  return applySecurityHeaders(response);
});

export const config = {
  // Match all routes to apply security headers
  // More specific matchers for auth protection
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
