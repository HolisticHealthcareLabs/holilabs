/**
 * Patient Registration API
 *
 * POST /api/portal/auth/register - Register new patient account
 *
 * Features:
 * - Password complexity validation
 * - Email uniqueness check
 * - Patient + PatientUser record creation
 * - Email verification token generation
 * - Welcome email with verification link
 * - Rate limiting (3 registrations per hour per IP)
 * - HIPAA audit logging
 *
 * @security Rate limited to prevent spam registrations
 * @compliance HIPAA §164.312(a)(2)(i) - User registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmailVerificationEmail } from '@/lib/email';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { createPublicRoute } from '@/lib/api/middleware';
import { validatePassword } from '@/lib/auth/password-validation';
import { generatePatientDataHash } from '@/lib/blockchain/hashing';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const POST = createPublicRoute(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { email, password, firstName, lastName, dateOfBirth, phone } = body;

      // Validate required fields
      if (!email || !password || !firstName || !lastName || !dateOfBirth) {
        return NextResponse.json(
          {
            error: 'Missing required fields',
            required: ['email', 'password', 'firstName', 'lastName', 'dateOfBirth'],
          },
          { status: 400 }
        );
      }

      // Validate email format
      if (!email.includes('@')) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Validate password complexity
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        logger.info({
          event: 'portal_register_weak_password',
          email: email.toLowerCase(),
          errors: passwordValidation.errors,
        });

        return NextResponse.json(
          {
            error: 'Password does not meet security requirements',
            requirements: passwordValidation.errors,
          },
          { status: 400 }
        );
      }

      // Check if user already exists
      const existingPatientUser = await prisma.patientUser.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingPatientUser) {
        logger.info({
          event: 'portal_register_duplicate_email',
          email: email.toLowerCase(),
        });

        return NextResponse.json(
          {
            error: 'An account with this email already exists',
            hint: 'Try logging in or use the "Forgot Password" option',
          },
          { status: 409 }
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Parse date of birth
      let dob: Date;
      try {
        dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
          throw new Error('Invalid date');
        }
      } catch (err) {
        return NextResponse.json(
          { error: 'Invalid date of birth format' },
          { status: 400 }
        );
      }

      // Calculate age band for privacy
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      let ageBand = '0-17';
      if (age >= 18 && age <= 29) ageBand = '18-29';
      else if (age >= 30 && age <= 39) ageBand = '30-39';
      else if (age >= 40 && age <= 49) ageBand = '40-49';
      else if (age >= 50 && age <= 59) ageBand = '50-59';
      else if (age >= 60 && age <= 69) ageBand = '60-69';
      else if (age >= 70) ageBand = '70+';

      // Generate MRN (Medical Record Number)
      const mrnPrefix = 'MRN';
      const mrnTimestamp = Date.now().toString(36).toUpperCase();
      const mrnRandom = crypto.randomBytes(2).toString('hex').toUpperCase();
      const mrn = `${mrnPrefix}-${mrnTimestamp}-${mrnRandom}`;

      // Generate token ID for patient
      const tokenId = `PT-${crypto.randomBytes(6).toString('hex')}`;

      // Create patient record
      const patient = await prisma.patient.create({
        data: {
          firstName,
          lastName,
          dateOfBirth: dob,
          email: email.toLowerCase(),
          phone: phone || null,
          mrn,
          tokenId,
          ageBand,
          gender: 'U', // Unknown - can be updated in profile
          // Generate blockchain data hash
          dataHash: generatePatientDataHash({
            id: 'temp', // Will be updated with actual ID
            firstName,
            lastName,
            dateOfBirth: dob.toISOString(),
            mrn,
          }),
          lastHashUpdate: new Date(),
        },
      });

      // Update patient with actual ID in hash
      await prisma.patient.update({
        where: { id: patient.id },
        data: {
          dataHash: generatePatientDataHash({
            id: patient.id,
            firstName,
            lastName,
            dateOfBirth: dob.toISOString(),
            mrn,
          }),
        },
      });

      // Generate email verification token
      const verificationToken = generateToken();
      const tokenHash = hashToken(verificationToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create patient user record with verification token
      const patientUser = await prisma.patientUser.create({
        data: {
          patientId: patient.id,
          email: email.toLowerCase(),
          phone: phone || null,
          passwordHash,
          emailVerifiedAt: null, // Not verified yet
          mfaEnabled: false,
        },
      });

      // Create magic link for email verification (reuse existing infrastructure)
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await prisma.magicLink.create({
        data: {
          patientUserId: patientUser.id,
          token: verificationToken,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      // Build verification URL
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/auth/verify?token=${verificationToken}`;

      // Send email verification email
      let emailResult: any = null;
      try {
        emailResult = await sendEmailVerificationEmail(
          patientUser.email,
          `${patient.firstName} ${patient.lastName}`,
          verificationUrl
        );

        logger.info({
          event: 'portal_register_verification_sent',
          patientUserId: patientUser.id,
          patientId: patient.id,
          emailSuccess: !!emailResult?.success,
        });
      } catch (emailError) {
        logger.error({
          event: 'portal_register_email_error',
          patientUserId: patientUser.id,
          error: emailError instanceof Error ? emailError.message : 'Unknown error',
        });

        // Don't fail registration if email fails
        // User can request new verification email later
      }

      // HIPAA Audit Log: Patient registration
      await createAuditLog({
        action: 'CREATE',
        resource: 'PatientUser',
        resourceId: patientUser.id,
        details: {
          method: 'registration',
          patientId: patient.id,
          mrn: patient.mrn,
          emailSent: !!emailResult?.success,
          emailDevInboxFile: emailResult?.data?.devInboxFile,
        },
        success: true,
      });

      logger.info({
        event: 'portal_register_success',
        patientUserId: patientUser.id,
        patientId: patient.id,
        mrn: patient.mrn,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully! Please check your email to verify your account.',
          ...(process.env.NODE_ENV === 'development'
            ? {
                verificationUrl,
                emailDevInboxFile: emailResult?.data?.devInboxFile,
                emailConfigured: !!process.env.RESEND_API_KEY,
              }
            : {}),
          patient: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            mrn: patient.mrn,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      logger.error({
        event: 'portal_register_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.json(
        {
          error: 'Failed to create account',
          details:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.message
                : 'Unknown error'
              : undefined,
        },
        { status: 500 }
      );
    }
  },
  {
    // ✅ SECURITY: Rate limiting to prevent spam registrations
    // Limits: 3 registrations per hour per IP address
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 registrations per hour
    },
  }
);
