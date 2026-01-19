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
import bcrypt from 'bcryptjs';
import { sendEmail } from '@/lib/email';

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

    // Check if email already exists (either as clinician user or pending registration)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      logger.info({
        event: 'registration_attempt_existing_email',
      });

      return NextResponse.json(
        {
          error: 'An account with this email already exists. Please sign in.',
        },
        { status: 409 }
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

    // Create clinician account immediately (email+password login via NextAuth Credentials provider)
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        email: normalizedEmail,
        firstName,
        lastName,
        role: mapClinicianRole(role) as any,
        passwordHash,
        licenseNumber: licenseNumber || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // Send confirmation/welcome email (writes to dev inbox when not configured)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const loginUrl = `${baseUrl}/auth/login`;
    const emailRes = await sendEmail({
      to: created.email,
      subject: 'Welcome to Holi Labs — Your account is ready',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
          <h1 style="margin: 0 0 12px 0; color: #0f172a;">Welcome to Holi Labs</h1>
          <p style="margin: 0 0 16px 0; color: #334155; line-height: 1.6;">
            Hi ${created.firstName}, your clinician account has been created.
          </p>
          <p style="margin: 0 0 20px 0; color: #334155; line-height: 1.6;">
            You can sign in here:
          </p>
          <p style="margin: 0 0 24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#014751;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
              Sign in to Holi Labs
            </a>
          </p>
          ${
            enableDemoMode
              ? `<p style="margin: 0; color: #334155; line-height: 1.6;">
                  You selected <strong>Demo Mode</strong>. After you sign in, you can enable Demo Mode from the top bar and load sample patients.
                </p>`
              : ''
          }
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="margin:0;color:#64748b;font-size:12px;">
            If you did not create this account, please contact support.
          </p>
        </div>
      `,
      text: `Welcome to Holi Labs\n\nHi ${created.firstName}, your clinician account has been created.\n\nSign in: ${loginUrl}\n`,
      tags: [
        { name: 'type', value: 'clinician_welcome' },
        { name: 'category', value: 'transactional' },
      ],
    });

    // Customize message based on verification status
    let responseMessage = 'Account created successfully. Please check your email for next steps.';

    if (licenseVerificationStatus === 'AUTO_VERIFIED' || licenseVerificationStatus === 'VERIFIED') {
      responseMessage = '✅ Account created! Your medical license has been verified.';
    } else if (licenseVerificationStatus === 'PENDING') {
      responseMessage = 'Account created. Your medical license verification is pending.';
    }

    return NextResponse.json(
      {
        success: true,
        message: responseMessage,
        licenseVerificationStatus,
        ...(process.env.NODE_ENV === 'development'
          ? { emailDevInboxFile: (emailRes as any)?.data?.devInboxFile, loginUrl }
          : {}),
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
