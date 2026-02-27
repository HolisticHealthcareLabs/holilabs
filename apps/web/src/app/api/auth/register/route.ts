/**
 * Clinician Registration API
 *
 * POST /api/auth/register
 *
 * Creates the account, generates a unique username, and sends
 * a branded welcome email via Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withValidation, registrationSchema } from '@/lib/validation';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/email';
import { generateUsername } from '@/lib/auth/username';

export const dynamic = 'force-dynamic';

function mapClinicianRole(role: string) {
  switch (role) {
    case 'doctor':
      return 'PHYSICIAN';
    case 'nurse':
      return 'NURSE';
    case 'admin':
      return 'ADMIN';
    case 'staff':
    default:
      return 'RECEPTIONIST';
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const validation = await withValidation(registrationSchema)(request);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status },
      );
    }

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      organization,
      reason,
      enableDemoMode,
      licenseCountry,
      licenseNumber,
      licenseState,
    } = validation.data;
    const normalizedEmail = String(email).toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      logger.info({ event: 'registration_attempt_existing_email' });
      return NextResponse.json(
        { error: 'An account with this email already exists. Please sign in.' },
        { status: 409 },
      );
    }

    // Medical license verification for doctors
    let licenseVerificationStatus = 'NOT_REQUIRED';
    let licenseVerificationNotes = '';

    if (role === 'doctor' && licenseCountry && licenseNumber && licenseState) {
      try {
        const { verifyMedicalLicense } = await import(
          '@/lib/medical-license-verification'
        );

        const verificationResult = await verifyMedicalLicense({
          firstName,
          lastName,
          licenseNumber,
          country: licenseCountry as 'BR' | 'AR' | 'US',
          state: licenseState,
        });

        licenseVerificationStatus = verificationResult.status;
        licenseVerificationNotes = verificationResult.verificationNotes || '';

        logger.info({
          event: 'license_verification_during_registration',
          verificationStatus: verificationResult.status,
          verified: verificationResult.verified,
          source: verificationResult.source,
        });

        if (
          verificationResult.status === 'NO_MATCH' ||
          verificationResult.status === 'NOT_FOUND'
        ) {
          return NextResponse.json(
            {
              error: 'License verification failed',
              details:
                'We could not verify your medical license. Please check your license number and try again.',
              verificationNotes: verificationResult.verificationNotes,
            },
            { status: 400 },
          );
        }
      } catch (verificationError) {
        logger.error({
          event: 'license_verification_error_during_registration',
          error:
            verificationError instanceof Error
              ? verificationError.message
              : 'Unknown error',
        });
        licenseVerificationStatus = 'ERROR';
        licenseVerificationNotes =
          'Verification service temporarily unavailable. Manual review required.';
      }
    }

    logger.info({
      event: 'clinician_registration_request',
      role,
      organization,
      licenseVerificationStatus,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Generate collision-free username
    const username = await generateUsername(normalizedEmail, firstName, lastName);

    // Create the clinician account
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        username,
        role: mapClinicianRole(role) as any,
        passwordHash,
        licenseNumber: licenseNumber || null,
        onboardingCompleted: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
      },
    });

    // Send branded welcome email via Resend (React template)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/auth/login`;

    const emailRes = await sendWelcomeEmail(
      created.email,
      created.firstName,
      created.username!,
      loginUrl,
      enableDemoMode,
    );

    let responseMessage =
      'Account created successfully. Please check your email for next steps.';

    if (
      licenseVerificationStatus === 'AUTO_VERIFIED' ||
      licenseVerificationStatus === 'VERIFIED'
    ) {
      responseMessage =
        '✅ Account created! Your medical license has been verified.';
    } else if (licenseVerificationStatus === 'PENDING') {
      responseMessage =
        'Account created. Your medical license verification is pending.';
    }

    return NextResponse.json(
      {
        success: true,
        message: responseMessage,
        username: created.username,
        licenseVerificationStatus,
        ...(process.env.NODE_ENV === 'development'
          ? {
              emailDevInboxFile: (emailRes as any)?.data?.devInboxFile,
              loginUrl,
            }
          : {}),
      },
      { status: 200 },
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      event: 'registration_error',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        error: 'Failed to process registration request',
        details: isDevelopment
          ? errorMessage
          : 'Please try again later or contact support',
      },
      { status: 500 },
    );
  }
}
