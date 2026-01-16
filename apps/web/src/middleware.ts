/**
 * Next.js Middleware for Authentication, i18n, Security, and LGPD Compliance
 *
 * Protects dashboard routes, manages sessions, enforces access reasons (LGPD Art. 18), and applies security headers
 */

import { type NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';


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

// Locale handling removed - application uses client-side translation system

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
  }

  const pathname = request.nextUrl.pathname;

  // ===== LOCALE PREFIX SELF-HEAL =====
  // We do NOT use locale-prefixed routes in this app. However, older/stale builds
  // (or cached links) may still point to `/en/...`, `/es/...`, `/pt/...`.
  // Redirect these to the canonical non-prefixed route to avoid 404s.
  const supportedLocalePrefixes = ['en', 'es', 'pt'] as const;
  for (const loc of supportedLocalePrefixes) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const url = request.nextUrl.clone();
      const stripped = pathname.replace(new RegExp(`^/${loc}(?=/|$)`), '') || '/';
      url.pathname = stripped;
      return NextResponse.redirect(url);
    }
  }

  // ===== LGPD ACCESS REASON ENFORCEMENT =====
  const isPHIRequest = PHI_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint));

  // In production, require an explicit access reason header for PHI reads.
  // In local development/demo, this can break the UX (the browser won't add the header by default),
  // so we only enforce it when it actually matters (production) or when explicitly enabled.
  const enforceAccessReason =
    process.env.REQUIRE_ACCESS_REASON === 'true' || process.env.NODE_ENV === 'production';

  if (enforceAccessReason && isPHIRequest && request.method !== 'OPTIONS') {
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

  // Supabase has been removed. NextAuth + patient-session handle auth.
  const response = NextResponse.next();

  // Add pathname to response headers for layout routing logic
  response.headers.set('x-pathname', pathname);

  // Generate cryptographically secure nonce for CSP
  // Nonce is used to allow specific inline scripts while blocking others (XSS protection)
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

  // Make nonce available to pages via header (for inline script tags: <script nonce={nonce}>)
  response.headers.set('x-nonce', nonce);

  return applySecurityHeaders(response, nonce);
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
};
