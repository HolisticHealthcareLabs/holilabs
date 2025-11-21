/**
 * Send OTP API
 *
 * POST /api/portal/auth/otp/send - Send OTP code via SMS or email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendOTPCode, sendWhatsApp, isTwilioConfigured } from '@/lib/sms/twilio';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendSMSCode(phone: string, code: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    logger.warn({
      event: 'otp_twilio_not_configured',
      message: 'Twilio not configured, logging code instead',
      phone,
    });
    console.log(`[DEV MODE] OTP code for ${phone}: ${code}`);
    return true; // Allow in dev mode
  }

  return await sendOTPCode(phone, code);
}

async function sendWhatsAppCode(phone: string, code: string): Promise<boolean> {
  if (!isTwilioConfigured()) {
    logger.warn({
      event: 'otp_twilio_not_configured',
      message: 'Twilio not configured, logging code instead',
      phone,
    });
    console.log(`[DEV MODE] WhatsApp OTP code for ${phone}: ${code}`);
    return true; // Allow in dev mode
  }

  const message = `Tu código de verificación de Holi Labs es: ${code}. Válido por 10 minutos.`;
  return await sendWhatsApp({ to: phone, message });
}

async function sendOTPCodeEmail(email: string, code: string): Promise<boolean> {
  const { sendOTPEmail, isResendConfigured } = await import('@/lib/email');

  if (!isResendConfigured()) {
    logger.warn({
      event: 'otp_resend_not_configured',
      message: 'Resend not configured, logging code instead',
      email,
    });
    console.log(`[DEV MODE] Email OTP code for ${email}: ${code}`);
    return true; // Allow in dev mode
  }

  return await sendOTPEmail(email, code);
}

export async function POST(request: NextRequest) {
  // Apply rate limiting - 5 requests per minute for auth endpoints
  const rateLimitResponse = await checkRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { phone, email, channel = 'SMS' } = body;

    // Validate input
    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone number or email is required' },
        { status: 400 }
      );
    }

    // Find patient user
    let patientUser;
    if (phone) {
      patientUser = await prisma.patientUser.findUnique({
        where: { phone },
      });
    } else if (email) {
      patientUser = await prisma.patientUser.findUnique({
        where: { email: email.toLowerCase() },
      });
    }

    if (!patientUser) {
      // For security, don't reveal if account exists
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists, an OTP code has been sent.'
        },
        { status: 200 }
      );
    }

    // Check if MFA is enabled
    if (!patientUser.mfaEnabled) {
      return NextResponse.json(
        { error: 'Multi-factor authentication is not enabled for this account' },
        { status: 400 }
      );
    }

    // Generate OTP code
    const code = generateOTPCode();
    const codeHash = hashCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create OTP record
    await prisma.oTPCode.create({
      data: {
        patientUserId: patientUser.id,
        code,
        codeHash,
        expiresAt,
        sentVia: channel as 'SMS' | 'EMAIL' | 'WHATSAPP',
        recipientPhone: phone,
        recipientEmail: email,
      },
    });

    // Send OTP via selected channel
    try {
      let sent = false;

      if (channel === 'SMS' && phone) {
        sent = await sendSMSCode(phone, code);
      } else if (channel === 'EMAIL' && email) {
        sent = await sendOTPCodeEmail(email, code);
      } else if (channel === 'WHATSAPP' && phone) {
        sent = await sendWhatsAppCode(phone, code);
      }

      if (!sent) {
        logger.error({
          event: 'otp_send_failed',
          channel,
          phone,
          email,
        });
        return NextResponse.json(
          { error: 'Failed to send OTP code. Please try again.' },
          { status: 500 }
        );
      }
    } catch (sendError) {
      logger.error({
        event: 'otp_send_error',
        error: sendError instanceof Error ? sendError.message : 'Unknown error',
        channel,
      });
      return NextResponse.json(
        { error: 'Failed to send OTP code' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `OTP code sent via ${channel}`,
        expiresIn: 600, // seconds
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      {
        error: 'Failed to send OTP',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
