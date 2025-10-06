/**
 * CORS Configuration - Industry-Grade
 *
 * Whitelist specific origins only (never use '*' in production)
 * Protects against cross-site request forgery and data theft
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Allowed origins - UPDATE THIS LIST with your actual domains
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'https://holilabs-iwp6y.ondigitalocean.app',
  'https://your-custom-domain.com', // Add your custom domain here
];

// Remove localhost in production
const getAllowedOrigins = (): string[] => {
  if (process.env.NODE_ENV === 'production') {
    return ALLOWED_ORIGINS.filter((origin) => !origin.includes('localhost'));
  }
  return ALLOWED_ORIGINS;
};

/**
 * CORS Middleware
 * Add to any API route that should accept cross-origin requests
 */
export function corsHeaders(request: NextRequest): Headers {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  const headers = new Headers();

  // Only allow whitelisted origins
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigins.length === 1) {
    // If only one origin, allow it (common for single-domain apps)
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  // Standard CORS headers
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Request-ID'
  );
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours preflight cache

  return headers;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handlePreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}

/**
 * Apply CORS headers to response
 */
export function applyCorsHeaders(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const headers = corsHeaders(request);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}
