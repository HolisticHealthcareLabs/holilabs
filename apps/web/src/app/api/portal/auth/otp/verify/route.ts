/**
 * Verify OTP API
 *
 * POST /api/portal/auth/otp/verify - Verify OTP code
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function POST(request: NextRequest) {
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
        where: { id: otpRecord.patientUserId },
        data: { phoneVerifiedAt: new Date() },
      });
    }

    // Update email verified status if EMAIL
    if (email && otpRecord.sentVia === 'EMAIL') {
      await prisma.patientUser.update({
        where: { id: otpRecord.patientUserId },
        data: { emailVerifiedAt: new Date() },
      });
    }

    logger.info({
      event: 'otp_verified_success',
      patientUserId: otpRecord.patientUserId,
      sentVia: otpRecord.sentVia,
      attempts: otpRecord.attempts + 1,
    });

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
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify OTP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
