/**
 * Verify OTP API
 *
 * POST /api/portal/auth/otp/verify - Verify OTP code
 *
 * @security Rate limited to 5 attempts per 15 minutes per IP to prevent brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import logger from '@/lib/logger';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { createPublicRoute, ApiContext } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const POST = createPublicRoute(
  async (request: NextRequest, context: ApiContext) => {
  try {
    const body = await request.json();
    const { code, phone, email } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    // Hash the code
    const codeHash = hashCode(code);

    // Find the OTP record
    const otpRecord = await prisma.oTPCode.findUnique({
      where: { codeHash },
      include: {
        patientUser: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Check if already used
    if (otpRecord.usedAt) {
      return NextResponse.json(
        { error: 'Verification code has already been used' },
        { status: 401 }
      );
    }

    // Check if expired
    if (new Date() > new Date(otpRecord.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired' },
        { status: 401 }
      );
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum verification attempts exceeded. Please request a new code.' },
        { status: 401 }
      );
    }

    // Verify the recipient matches
    const recipientMatches =
      (phone && otpRecord.recipientPhone === phone) ||
      (email && otpRecord.recipientEmail === email);

    if (!recipientMatches) {
      // Increment attempts
      await prisma.oTPCode.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Mark OTP as used
    await prisma.oTPCode.update({
      where: { id: otpRecord.id },
      data: {
        usedAt: new Date(),
        attempts: { increment: 1 },
      },
    });

    // Update phone verified status if SMS
    if (phone && otpRecord.sentVia === 'SMS') {
      await prisma.patientUser.update({
        where: { id: otpRecord.patientUser.id },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    // Update email verified status if EMAIL
    if (email && otpRecord.sentVia === 'EMAIL') {
      await prisma.patientUser.update({
        where: { id: otpRecord.patientUser.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    logger.info({
      event: 'otp_verified_success',
      patientId: otpRecord.patientUser.id,
      sentVia: otpRecord.sentVia,
      attempts: otpRecord.attempts + 1,
    });

    // HIPAA Audit Log: OTP verification success
    await createAuditLog({
      action: 'READ',
      resource: 'PatientAuth',
      resourceId: otpRecord.patientUser.id,
      details: {
        method: 'otp',
        sentVia: otpRecord.sentVia,
        attempts: otpRecord.attempts + 1,
        patientId: otpRecord.patientUser.patient.id,
      },
      success: true,
    });

    // Track analytics event (NO PHI!)
    await trackEvent(
      ServerAnalyticsEvents.OTP_VERIFIED,
      otpRecord.patientUser.id,
      {
        method: otpRecord.sentVia, // SMS or EMAIL
        attempts: otpRecord.attempts + 1,
        success: true
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Verification successful',
        patient: {
          id: otpRecord.patientUser.patient.id,
          firstName: otpRecord.patientUser.patient.firstName,
          lastName: otpRecord.patientUser.patient.lastName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'portal_otp_verify_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      {
        error: 'Failed to verify OTP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
  },
  {
    // ✅ SECURITY: Rate limiting to prevent brute force OTP attacks
    // Limits: 5 attempts per 15 minutes per IP address
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
    },
  }
);
