/**
 * Send OTP API
 *
 * POST /api/portal/auth/otp/send - Send OTP code via SMS or email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function sendSMS(phone: string, code: string): Promise<void> {
  // TODO: Implement Twilio SMS sending
  console.log(`Would send SMS to ${phone}: Your verification code is ${code}`);

  // Example Twilio implementation:
  /*
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `Your Holi Labs verification code is: ${code}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
  */
}

async function sendOTPEmail(email: string, code: string): Promise<void> {
  // TODO: Implement email sending
  console.log(`Would send email to ${email}: Your verification code is ${code}`);
}

export async function POST(request: NextRequest) {
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
      if (channel === 'SMS' && phone) {
        await sendSMS(phone, code);
      } else if (channel === 'EMAIL' && email) {
        await sendOTPEmail(email, code);
      } else if (channel === 'WHATSAPP' && phone) {
        // TODO: Implement WhatsApp sending
        console.log(`Would send WhatsApp to ${phone}: ${code}`);
      }
    } catch (sendError) {
      console.error('Error sending OTP:', sendError);
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
