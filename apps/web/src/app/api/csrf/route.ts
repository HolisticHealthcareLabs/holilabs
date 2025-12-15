/**
 * CSRF Token API
 *
 * GET /api/csrf - Generate and return a CSRF token
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/security/csrf';
import logger from '@/lib/logger';

// Force dynamic rendering - don't try to generate at build time
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = generateCsrfToken();

    logger.info({
      event: 'csrf_token_generated',
      tokenLength: token.length,
    });

    const response = NextResponse.json({
      success: true,
      token,
    });

    // Set CSRF token in cookie (double-submit pattern)
    // Use strict SameSite policy for maximum CSRF protection
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Strict in production
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    logger.error({
      event: 'csrf_token_generation_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'Failed to generate CSRF token',
      },
      { status: 500 }
    );
  }
}
