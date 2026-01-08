/**
 * Security Headers Configuration
 *
 * Production-grade security headers for HIPAA compliance
 */

import { NextResponse } from 'next/server';

/**
 * Content Security Policy (CSP) with nonce support
 *
 * @param nonce - Cryptographically secure nonce for inline scripts
 */
function getCSP(nonce?: string) {
  const isDev = process.env.NODE_ENV === 'development';

  const cspDirectives = [
    // Default source - only same origin
    "default-src 'self'",

    // Scripts - use nonce for inline scripts instead of unsafe-inline
    // Development: Allow unsafe-eval for HMR and hot-reloading
    // Production: Strict nonce-based policy
    isDev
      ? `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ""} 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com`
      : `script-src 'self' ${nonce ? `'nonce-${nonce}'` : ""} https://cdn.jsdelivr.net https://unpkg.com https://vercel.live`,

    // Styles - keep unsafe-inline for Tailwind/CSS-in-JS (required for dynamic styling)
    // TODO: Consider moving to nonce-based styles if performance impact is acceptable
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
 *
 * @param response - NextResponse to add headers to
 * @param nonce - Optional nonce for CSP script-src
 * @returns Response with security headers applied
 *
 * @example
 * ```typescript
 * // In middleware
 * import { randomBytes } from 'crypto';
 * const nonce = randomBytes(16).toString('base64');
 * const response = NextResponse.next();
 * applySecurityHeaders(response, nonce);
 * response.headers.set('x-nonce', nonce); // Make nonce available to pages
 * ```
 */
export function applySecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  // Content Security Policy with nonce support
  response.headers.set('Content-Security-Policy', getCSP(nonce));

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

  // Referrer policy - protect privacy (more restrictive)
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');

  // Permissions policy - restrict dangerous features
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',           // No camera access
      'microphone=()',       // No microphone access
      'geolocation=(self)',  // Geolocation only from same origin
      'interest-cohort=()',  // Disable FLoC tracking
      'payment=(self)',      // Payment only from same origin
      'usb=()',             // No USB access
      'magnetometer=()',    // No magnetometer access
      'gyroscope=()',       // No gyroscope access
      'accelerometer=()',   // No accelerometer access
      'ambient-light-sensor=()', // No ambient light sensor
      'autoplay=(self)',    // Autoplay only from same origin
      'encrypted-media=(self)', // Encrypted media only from same origin
      'fullscreen=(self)',  // Fullscreen only from same origin
      'picture-in-picture=()', // No picture-in-picture
    ].join(', ')
  );

  // Cache-Control - Prevent caching of sensitive data (HIPAA §164.312(a)(2)(iv))
  // PHI must not be cached in browsers or intermediary proxies
  response.headers.set(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, private, max-age=0'
  );
  response.headers.set('Pragma', 'no-cache'); // HTTP/1.0 compatibility
  response.headers.set('Expires', '0'); // Proxy compatibility

  // Cross-Origin Security Headers (modern browser security)
  // These headers help prevent cross-origin attacks and improve security reputation
  // Cross-Origin-Embedder-Policy: Prevents document from loading cross-origin resources that don't explicitly grant permission
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');

  // Cross-Origin-Opener-Policy: Prevents other origins from gaining reference to your window
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  // Cross-Origin-Resource-Policy: Prevents other origins from embedding resources
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site');

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
