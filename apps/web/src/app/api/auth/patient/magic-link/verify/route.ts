/**
 * Patient Magic Link Verify API
 *
 * POST /api/auth/patient/magic-link/verify
 * Verify magic link token and create authenticated session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyMagicLink } from '@/lib/auth/magic-link';
import logger from '@/lib/logger';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Validation schema
const VerifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token es requerido'),
});

// JWT secret
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || 'fallback-secret'
);

// Session duration: 7 days
const SESSION_DURATION_DAYS = 7;

/**
 * Create JWT token for patient session
 */
async function createSessionToken(patientUser: any): Promise<string> {
  const token = await new SignJWT({
    userId: patientUser.id,
    patientId: patientUser.patientId,
    email: patientUser.email,
    type: 'patient',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(JWT_SECRET);

  return token;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = VerifyMagicLinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Datos inválidos',
        },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Verify magic link
    const result = await verifyMagicLink(token);

    if (!result.success || !result.patientUser) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Enlace inválido o expirado',
        },
        { status: 401 }
      );
    }

    // Create session token
    const sessionToken = await createSessionToken(result.patientUser);

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set('patient-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    });

    logger.info({
      event: 'patient_login_success',
            patientId: result.patientUser.patientId,
      method: 'magic_link',
    });

    // Return success with patient data
    return NextResponse.json(
      {
        success: true,
        message: 'Inicio de sesión exitoso',
        patient: {
          id: result.patientUser.id,
          patientId: result.patientUser.patientId,
          email: result.patientUser.email,
          firstName: result.patientUser.patient.firstName,
          lastName: result.patientUser.patient.lastName,
          emailVerified: !!result.patientUser.emailVerifiedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'magic_link_verify_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error del servidor. Por favor, intenta de nuevo.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to verify token from URL query parameter
 * This allows clicking the link directly from email
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(
        new URL('/portal/login?error=missing_token', request.url)
      );
    }

    // Verify magic link
    const result = await verifyMagicLink(token);

    if (!result.success || !result.patientUser) {
      return NextResponse.redirect(
        new URL(
          `/portal/login?error=${encodeURIComponent(result.error || 'invalid_link')}`,
          request.url
        )
      );
    }

    // Create session token
    const sessionToken = await createSessionToken(result.patientUser);

    // Set session cookie
    const cookieStore = cookies();
    cookieStore.set('patient-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    });

    logger.info({
      event: 'patient_login_success',
            patientId: result.patientUser.patientId,
      method: 'magic_link_get',
    });

    // Redirect to patient portal dashboard
    return NextResponse.redirect(new URL('/portal/dashboard', request.url));
  } catch (error) {
    logger.error({
      event: 'magic_link_verify_get_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.redirect(
      new URL('/portal/login?error=server_error', request.url)
    );
  }
}
