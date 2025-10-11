/**
 * Patient OTP Verify API
 *
 * POST /api/auth/patient/otp/verify
 * Verify OTP code and create authenticated session
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOTP } from '@/lib/auth/otp';
import logger from '@/lib/logger';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

// Validation schema
const VerifyOTPSchema = z.object({
  phone: z.string().min(10, 'Teléfono inválido'),
  code: z.string().length(6, 'Código debe tener 6 dígitos'),
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
    const validation = VerifyOTPSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Datos inválidos',
        },
        { status: 400 }
      );
    }

    const { phone, code } = validation.data;

    // Verify OTP
    const result = await verifyOTP(phone, code);

    if (!result.success || !result.patientUser) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Código inválido',
          attemptsLeft: result.attemptsLeft,
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
      patientUserId: result.patientUser.id,
      patientId: result.patientUser.patientId,
      method: 'otp',
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
          phone: result.patientUser.phone,
          firstName: result.patientUser.patient.firstName,
          lastName: result.patientUser.patient.lastName,
          phoneVerified: !!result.patientUser.phoneVerifiedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'otp_verify_error',
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
