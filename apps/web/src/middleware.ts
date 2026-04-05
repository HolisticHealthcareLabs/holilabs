/**
 * Next.js Middleware for Authentication, i18n (next-intl), Security, and LGPD Compliance
 *
 * - Locale routing for landing page (en / pt-BR) via next-intl
 * - Protects dashboard routes, manages sessions
 * - Enforces access reasons (LGPD Art. 18)
 * - Applies security headers
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';

// next-intl middleware instance (handles locale detection + rewriting)
const handleI18nRouting = createIntlMiddleware(routing);

// LGPD-protected endpoints (require access reason)
const PHI_ENDPOINTS = [
  '/api/patients/',
  '/api/soap-notes/',
  '/api/lab-results/',
  '/api/prescriptions/',
  '/api/consultations/',
  '/api/medical-records/',
  '/api/clinical-notes/',
];

const VALID_ACCESS_REASONS = [
  'CLINICAL_CARE',
  'EMERGENCY',
  'ADMINISTRATIVE',
  'PATIENT_REQUEST',
  'LEGAL_OBLIGATION',
  'RESEARCH',
  'QUALITY_IMPROVEMENT',
];

// Routes that are NOT locale-routed (bypass next-intl)
const NON_LOCALE_PREFIXES = [
  '/api',
  '/auth',
  '/dashboard',
  '/demo',
  '/sign-in',
  '/portal',
  '/enterprise',
  '/onboarding',
  '/download',
  '/legal',
  '/_next',
  '/_vercel',
];

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  const pathname = request.nextUrl.pathname;

  // Never run middleware on Next internals or static assets.
  const isStaticOrInternalRequest =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname === '/favicon.ico' ||
    /\.[^/]+$/.test(pathname);

  if (isStaticOrInternalRequest) {
    return NextResponse.next();
  }

  // Fast path for RSC (React Server Component) fetches during client navigation.
  // These are internal Next.js data requests and don't need CSP nonces or i18n.
  const rscHeader = request.headers.get('rsc');
  const nextAction = request.headers.get('next-action');
  if (rscHeader || nextAction) {
    return NextResponse.next();
  }

  // ===== LOCALE ROUTING (next-intl) =====
  // Only apply to the landing page and locale-prefixed variants.
  // All other routes (dashboard, demo, api, etc.) bypass locale routing.
  const isNonLocaleRoute = NON_LOCALE_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix)
  );
  const shouldBypassLocaleRouting = pathname === '/';

  if (!isNonLocaleRoute && !shouldBypassLocaleRouting) {
    // Let next-intl handle locale detection + rewriting for landing page
    const intlResponse = handleI18nRouting(request);

    // Apply security headers on top of next-intl response
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
    intlResponse.headers.set('x-nonce', nonce);
    intlResponse.headers.set('x-pathname', pathname);

    return applySecurityHeaders(intlResponse, nonce);
  }

  // ===== ONBOARDING INTERCEPT (dashboard routes only) =====
  if (pathname.startsWith('/dashboard')) {
    try {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token && token.onboardingCompleted === false) {
        const role = String(token.role ?? '').toUpperCase();
        const target = role === 'ADMIN' ? '/onboarding/admin' : '/onboarding';
        return NextResponse.redirect(new URL(target, request.url));
      }
    } catch {
      // Token decode failed; let the request continue to the dashboard
      // where the layout will handle unauthenticated users
    }
  }

  // ===== LGPD ACCESS REASON ENFORCEMENT =====
  const isPHIRequest = PHI_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));

  const enforceAccessReason =
    process.env.REQUIRE_ACCESS_REASON === 'true' || process.env.NODE_ENV === 'production';

  if (enforceAccessReason && isPHIRequest && request.method !== 'OPTIONS') {
    const accessReason = request.headers.get('X-Access-Reason');
    const isReadOperation = request.method === 'GET';

    if (isReadOperation && !accessReason) {
      // ASVS V7.1.1 — structured warning, no raw pathname to avoid PHI in URL segments
      console.warn(JSON.stringify({ event: 'lgpd_access_reason_missing', path: pathname.split('/').slice(0, 3).join('/') }));

      return NextResponse.json(
        {
          error: 'ACCESS_REASON_REQUIRED',
          message: 'LGPD Art. 18 compliance: Access reason required for viewing PHI',
          detail: 'Include X-Access-Reason header with valid reason code',
          validReasons: VALID_ACCESS_REASONS,
        },
        { status: 403 }
      );
    }

    if (accessReason && !VALID_ACCESS_REASONS.includes(accessReason)) {
      return NextResponse.json(
        {
          error: 'INVALID_ACCESS_REASON',
          message: `Invalid access reason: ${accessReason}`,
          validReasons: VALID_ACCESS_REASONS,
        },
        { status: 400 }
      );
    }
  }
  // ===== END LGPD ENFORCEMENT =====

  // Generate CSP nonce for all other routes
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  finalResponse.headers.set('x-pathname', pathname);
  finalResponse.headers.set('x-nonce', nonce);

  return applySecurityHeaders(finalResponse, nonce);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg|icon-.*\\.png|manifest\\.json|sw\\.js|workbox-.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|mp4|webm)).*)',
  ],
};
