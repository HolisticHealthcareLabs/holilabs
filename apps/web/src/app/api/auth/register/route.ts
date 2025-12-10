/**
 * Clinician Registration API
 *
 * POST /api/auth/register - Request access to the platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withValidation, registrationSchema } from '@/lib/validation';
import logger from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Apply rate limiting - 5 requests per minute for auth endpoints
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Validate input
    const validation = await withValidation(registrationSchema)(request);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { firstName, lastName, email, role, organization, reason, licenseCountry, licenseNumber, licenseState } = validation.data;

    // Check if email already exists (either as clinician user or pending registration)
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Don't reveal if email exists (security)
      logger.info({
        event: 'registration_attempt_existing_email',
        // email removed for PHI compliance
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Registration request received. Our team will contact you within 24-48 hours.',
        },
        { status: 200 }
      );
    }

    // For doctors, verify medical license
    let licenseVerificationStatus = 'NOT_REQUIRED';
    let licenseVerificationNotes = '';

    if (role === 'doctor' && licenseCountry && licenseNumber && licenseState) {
      try {
        // Import verification function
        const { verifyMedicalLicense } = await import('@/lib/medical-license-verification');

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

        // If verification completely failed (not just pending), inform the user
        if (verificationResult.status === 'NO_MATCH' || verificationResult.status === 'NOT_FOUND') {
          return NextResponse.json(
            {
              error: 'License verification failed',
              details: 'We could not verify your medical license with the official registry. Please check your license number and try again, or contact support.',
              verificationNotes: verificationResult.verificationNotes,
            },
            { status: 400 }
          );
        }
      } catch (verificationError) {
        logger.error({
          event: 'license_verification_error_during_registration',
          error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
        });
        // Don't block registration if verification service fails
        licenseVerificationStatus = 'ERROR';
        licenseVerificationNotes = 'Verification service temporarily unavailable. Manual review required.';
      }
    }

    // Log the registration request
    logger.info({
      event: 'clinician_registration_request',
      // Personal data removed for PHI compliance
      role,
      organization,
      licenseVerificationStatus,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // TODO: Store in pending registrations table with license verification status
    // TODO: Send email to admin team with verification results
    // TODO: Send confirmation email to user

    // Customize message based on verification status
    let responseMessage = 'Registration request received. Our team will contact you within 24-48 hours.';

    if (licenseVerificationStatus === 'AUTO_VERIFIED' || licenseVerificationStatus === 'VERIFIED') {
      responseMessage = '✅ Registration successful! Your medical license has been verified. Our team will complete the review and activate your account within 24 hours.';
    } else if (licenseVerificationStatus === 'PENDING') {
      responseMessage = 'Registration received. Your medical license verification is pending. Our team will review and contact you within 24-48 hours.';
    }

    return NextResponse.json(
      {
        success: true,
        message: responseMessage,
        licenseVerificationStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      event: 'registration_error',
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Provide more helpful error messages in development
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        error: 'Failed to process registration request',
        details: isDevelopment ? errorMessage : 'Please try again later or contact support',
      },
      { status: 500 }
    );
  }
}
