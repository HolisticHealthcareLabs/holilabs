/**
 * Next.js Middleware for Authentication, i18n, Security, and LGPD Compliance
 *
 * Protects dashboard routes, manages sessions, enforces access reasons (LGPD Art. 18), and applies security headers
 */

import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';
import { randomBytes } from 'crypto';

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

  // Update session and apply security headers to all responses
  const response = await updateSession(request);

  // Add pathname to response headers for layout routing logic
  response.headers.set('x-pathname', pathname);

  // Generate cryptographically secure nonce for CSP
  // Nonce is used to allow specific inline scripts while blocking others (XSS protection)
  const nonce = randomBytes(16).toString('base64');

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
  runtime: 'nodejs', // Use Node.js runtime for Supabase compatibility
};
