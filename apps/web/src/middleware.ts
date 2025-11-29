/**
 * Next.js Middleware for Authentication, i18n, Security, and LGPD Compliance
 *
 * Protects dashboard routes, manages sessions, enforces access reasons (LGPD Art. 18), and applies security headers
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';
import { locales, defaultLocale } from '../i18n';

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

function getLocale(request: NextRequest): string {
  // Check if locale is in the pathname
  const pathname = request.nextUrl.pathname;
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameLocale) return pathnameLocale;

  // Check cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (localeCookie && locales.includes(localeCookie as any)) {
    return localeCookie;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const browserLocale = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(browserLocale as any)) {
      return browserLocale;
    }
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  const pathname = request.nextUrl.pathname;

  // ===== LGPD ACCESS REASON ENFORCEMENT =====
  const isPHIRequest = PHI_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));

  if (isPHIRequest && request.method !== 'OPTIONS') {
    const accessReason = request.headers.get('X-Access-Reason');

    // Only require for READ operations (GET)
    const isReadOperation = request.method === 'GET';

    if (isReadOperation && !accessReason) {
      console.warn(`[LGPD Violation] Missing access reason: ${pathname}`);

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

    // Validate access reason enum
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

  // Skip locale handling for API routes, static files, auth, portal, dashboard, pricing, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/shared') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/' ||
    pathname.includes('.')
  ) {
    const response = await updateSession(request);
    return applySecurityHeaders(response);
  }

  // Check if pathname has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Redirect if no locale in pathname
  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    return NextResponse.redirect(newUrl);
  }

  // Update session and get response
  const response = await updateSession(request);

  // Apply security headers to all responses
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - Files with extensions (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
  runtime: 'nodejs', // Use Node.js runtime for Supabase compatibility
};
