/**
 * CORS Configuration - Industry-Grade
 *
 * Security Features:
 * - Whitelist specific origins only (never use '*' in production)
 * - Protects against CSRF and XSS attacks
 * - Strict security headers
 * - Configurable via environment variables
 *
 * OWASP Best Practices:
 * - Never use wildcard (*) in production
 * - Always validate origin header
 * - Use credentials only with specific origins
 * - Set appropriate cache times for preflight
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Allowed origins - Production domains
 * Add multiple origins for staging, production, custom domains
 *
 * SECURITY: Never use wildcards (*) in production
 */
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://holilabs-lwp6y.ondigitalocean.app', // DigitalOcean app URL
  'https://app.holilabs.com',
  'https://holilabs.com',
  'https://www.holilabs.com',
  'https://holilabs.xyz',
  'https://www.holilabs.xyz',
].filter(Boolean); // Remove undefined/empty values

/**
 * Get allowed origins based on environment
 * Removes localhost in production for security
 */
const getAllowedOrigins = (): string[] => {
  if (process.env.NODE_ENV === 'production') {
    const origins = ALLOWED_ORIGINS.filter((origin) => !origin.includes('localhost'));

    // Log allowed origins on startup (once)
    if (!(global as any).__corsOriginsLogged) {
      logger.info({
        event: 'cors_config',
        allowedOrigins: origins.length,
      }, 'CORS allowed origins configured');
      (global as any).__corsOriginsLogged = true;
    }

    return origins;
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

    // Log blocked origins in production (potential security issue)
  } else if (origin && process.env.NODE_ENV === 'production') {
    logger.warn({
      event: 'cors_origin_blocked',
      origin,
      allowedOrigins: allowedOrigins.length,
      requestUrl: request.url,
    }, 'Blocked cross-origin request from unauthorized origin');
  } else if (allowedOrigins.length === 1) {
    // If only one origin, allow it (common for single-domain apps)
    headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  // Standard CORS headers - restrictive by default
  // Only allow necessary HTTP methods
  const allowedMethods = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';

  headers.set('Access-Control-Allow-Methods', allowedMethods);
  headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-CSRF-Token, X-Request-ID, X-Access-Reason'
  );

  // Only allow credentials when origin is whitelisted
  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

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
