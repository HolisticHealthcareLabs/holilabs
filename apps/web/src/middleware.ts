/**
 * Next.js Middleware for Authentication and Security
 *
 * Protects dashboard routes, manages Supabase sessions, and applies security headers
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applySecurityHeaders, handleCORSPreflight } from '@/lib/security-headers';

export async function middleware(request: NextRequest) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return handleCORSPreflight();
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
     * - auth routes (login, signup)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|auth|api).*)',
  ],
};
