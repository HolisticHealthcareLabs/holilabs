/**
 * Security Headers Configuration
 *
 * Production-grade security headers for HIPAA compliance
 */

import { NextResponse } from 'next/server';

/**
 * Content Security Policy (CSP)
 */
function getCSP() {
  const isDev = process.env.NODE_ENV === 'development';

  const cspDirectives = [
    // Default source - only same origin
    "default-src 'self'",

    // Scripts - allow same origin, specific CDNs, and unsafe-inline/eval for Next.js in dev
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com"
      : "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",

    // Styles - allow same origin and unsafe-inline for Tailwind/styled-components
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

    // Images - allow same origin, data URIs, and common image CDNs
    "img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org https://via.placeholder.com",

    // Fonts - allow same origin and Google Fonts
    "font-src 'self' data: https://fonts.gstatic.com",

    // Connect - allow same origin, API endpoints, and Supabase
    `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || ''} https://*.supabase.co ${
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    } wss://localhost:* ws://localhost:*`,

    // Media - allow same origin
    "media-src 'self' blob:",

    // Objects - disallow
    "object-src 'none'",

    // Frames - allow same origin (for OAuth flows)
    "frame-src 'self' https://*.supabase.co",

    // Base URI - restrict to same origin
    "base-uri 'self'",

    // Form actions - restrict to same origin
    "form-action 'self'",

    // Frame ancestors - prevent clickjacking (X-Frame-Options alternative)
    "frame-ancestors 'none'",

    // Upgrade insecure requests in production
    ...(!isDev ? ["upgrade-insecure-requests"] : []),
  ];

  return cspDirectives.join('; ');
}

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', getCSP());

  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy - protect privacy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy - restrict features
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()',
      'payment=(self)',
      'usb=()',
    ].join(', ')
  );

  // CORS headers
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  // Set CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]); // Primary origin
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Content-Type, Authorization, X-CSRF-Token, X-User-Id, X-Patient-Id'
  );
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCORSPreflight(): NextResponse {
  const response = new NextResponse(null, { status: 204 });

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim());

  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', allowedOrigins[0]);
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-Requested-With, Content-Type, Authorization, X-CSRF-Token, X-User-Id, X-Patient-Id'
  );
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}
