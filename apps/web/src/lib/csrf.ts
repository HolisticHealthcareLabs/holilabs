/**
 * CSRF Protection Utilities
 *
 * Implements CSRF token generation and validation
 * Uses double-submit cookie pattern
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Get or create CSRF token for the session
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME);

  if (existingToken && existingToken.value) {
    return existingToken.value;
  }

  // Generate new token
  const newToken = generateCSRFToken();

  // Set cookie (will be picked up by the response)
  cookieStore.set(CSRF_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return newToken;
}

/**
 * Validate CSRF token from request
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Both must exist and match
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  );
}

/**
 * Middleware to validate CSRF token
 */
export async function csrfProtection(
  request: NextRequest
): Promise<NextResponse | null> {
  // Only check POST, PUT, PATCH, DELETE requests
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null; // Allow request
  }

  // Skip CSRF check for API routes that don't need it
  // (e.g., webhook endpoints, public APIs)
  const pathname = request.nextUrl.pathname;
  const skipPaths = [
    '/api/webhooks/',
    '/api/public/',
  ];

  if (skipPaths.some(path => pathname.startsWith(path))) {
    return null; // Allow request
  }

  // Validate CSRF token
  const isValid = await validateCSRFToken(request);

  if (!isValid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    );
  }

  return null; // Allow request
}

/**
 * Generate CSRF token for forms
 * Usage in React Server Components:
 *
 * const csrfToken = await getCSRFToken();
 * <form>
 *   <input type="hidden" name="csrf_token" value={csrfToken} />
 * </form>
 */
export async function getCSRFTokenForForm(): Promise<string> {
  return await getCSRFToken();
}

/**
 * Client-side helper to get CSRF token from cookie
 * For use in client components
 */
export function getCSRFTokenFromCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie =>
    cookie.trim().startsWith(`${CSRF_COOKIE_NAME}=`)
  );

  if (!csrfCookie) {
    return null;
  }

  return csrfCookie.split('=')[1];
}

/**
 * Helper to add CSRF token to fetch requests
 */
export function withCSRFToken(options: RequestInit = {}): RequestInit {
  const token = getCSRFTokenFromCookie();

  if (!token) {
    console.warn('CSRF token not found in cookies');
    return options;
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      [CSRF_HEADER_NAME]: token,
    },
  };
}
