/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Prevents unauthorized actions on behalf of authenticated users
 *
 * SECURITY: Protects against CSRF attacks
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// CSRF TOKEN GENERATION
// ============================================================================

/**
 * Generate a cryptographically secure CSRF token
 * @returns Random token string
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token for comparison (timing-safe)
 * @param token - Token to hash
 * @returns Hashed token
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Compare two tokens in constant time (prevents timing attacks)
 * @param token1 - First token
 * @param token2 - Second token
 * @returns true if tokens match
 */
export function compareTokens(token1: string, token2: string): boolean {
  if (!token1 || !token2) return false;
  if (token1.length !== token2.length) return false;

  const buf1 = Buffer.from(token1);
  const buf2 = Buffer.from(token2);

  return crypto.timingSafeEqual(buf1, buf2);
}

// ============================================================================
// CSRF MIDDLEWARE
// ============================================================================

/**
 * CSRF protection middleware
 * Validates CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection() {
  return async (
    request: NextRequest,
    context: any,
    next: () => Promise<NextResponse>
  ) => {
    const method = request.method;

    // Only check CSRF for state-changing methods
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      return next();
    }

    // Get CSRF token from header
    const headerToken = request.headers.get('x-csrf-token');

    // Get CSRF token from cookie
    const cookieToken = request.cookies.get('csrf-token')?.value;

    // Both must exist
    if (!headerToken || !cookieToken) {
      return NextResponse.json(
        {
          error: 'CSRF token missing',
          message: 'Missing CSRF token. Please refresh the page and try again.',
        },
        { status: 403 }
      );
    }

    // Tokens must match (timing-safe comparison)
    if (!compareTokens(headerToken, cookieToken)) {
      return NextResponse.json(
        {
          error: 'CSRF token mismatch',
          message: 'Invalid CSRF token. Please refresh the page and try again.',
        },
        { status: 403 }
      );
    }

    // Token valid - proceed
    return next();
  };
}

// ============================================================================
// DOUBLE SUBMIT COOKIE PATTERN
// ============================================================================

/**
 * Set CSRF token in cookie and return token for client
 * Use this in login/signup flows
 */
export function setCsrfCookie(response: NextResponse): string {
  const token = generateCsrfToken();

  // Set httpOnly cookie (secure in production)
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  return token;
}

/**
 * Get CSRF token from request
 */
export function getCsrfToken(request: NextRequest): string | null {
  return request.cookies.get('csrf-token')?.value || null;
}

// ============================================================================
// CLIENT-SIDE HELPERS
// ============================================================================

/**
 * Get CSRF token from cookie (browser-side)
 * Use this in fetch requests
 */
export function getClientCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Add CSRF token to fetch options
 * Example:
 *   fetch('/api/patients', withCsrf({ method: 'POST', body: JSON.stringify(data) }))
 */
export function withCsrf(options: RequestInit = {}): RequestInit {
  const token = getClientCsrfToken();

  if (!token) {
    console.warn('No CSRF token found. Request may be rejected.');
  }

  return {
    ...options,
    headers: {
      ...options.headers,
      'X-CSRF-Token': token || '',
    },
  };
}

// ============================================================================
// TESTING
// ============================================================================

/**
 * Test CSRF functions
 */
export function testCsrf() {
  console.log('🛡️ Testing CSRF protection...\n');

  // Test 1: Generate token
  const token1 = generateCsrfToken();
  const token2 = generateCsrfToken();
  console.log('Test 1 - Token generation:');
  console.log('  Token 1 length:', token1.length);
  console.log('  Token 2 length:', token2.length);
  console.log('  Unique:', token1 !== token2 ? '✅' : '❌');

  // Test 2: Hash token
  const hash1 = hashToken('test');
  const hash2 = hashToken('test');
  const hash3 = hashToken('different');
  console.log('\nTest 2 - Token hashing:');
  console.log('  Same input same hash:', hash1 === hash2 ? '✅' : '❌');
  console.log('  Different input different hash:', hash1 !== hash3 ? '✅' : '❌');

  // Test 3: Compare tokens
  const testToken = 'abc123';
  console.log('\nTest 3 - Token comparison:');
  console.log('  Same tokens:', compareTokens(testToken, testToken) ? '✅' : '❌');
  console.log('  Different tokens:', !compareTokens(testToken, 'xyz789') ? '✅' : '❌');
  console.log('  Null tokens:', !compareTokens('', '') ? '✅' : '❌');

  console.log('\n✅ All tests completed!\n');
}

// Run tests if executed directly
if (require.main === module) {
  testCsrf();
}
