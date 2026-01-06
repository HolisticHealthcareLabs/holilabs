/**
 * Send Magic Link API
 *
 * POST /api/portal/auth/magic-link/send - Send magic link to patient email
 *
 * @security Rate limited to 3 attempts per hour per IP to prevent email spam
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { createPublicRoute, ApiContext } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const POST = createPublicRoute(
  async (request: NextRequest, context: ApiContext) => {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Find patient user by email
    const patientUser = await prisma.patientUser.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patientUser) {
      // For security, don't reveal if email exists
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, a magic link has been sent.'
        },
        { status: 200 }
      );
    }

    // Generate magic link token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create magic link record
    await prisma.magicLink.create({
      data: {
        patientUserId: patientUser.id,
        token,
        tokenHash,
        expiresAt,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Build magic link URL
    const magicLinkUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/portal/auth/verify?token=${token}`;

    // Send email with magic link
    try {
      await sendMagicLinkEmail(
        patientUser.email,
        `${patientUser.patient.firstName} ${patientUser.patient.lastName}`,
        magicLinkUrl,
        expiresAt
      );

      // HIPAA Audit Log: Magic link authentication attempt
      await createAuditLog({
        action: 'LOGIN',
        resource: 'PatientAuth',
        resourceId: patientUser.id,
        details: {
          method: 'magic_link',
          patientId: patientUser.patient.id,
          expiresAt: expiresAt.toISOString(),
        },
        success: true,
      });
    } catch (emailError) {
      logger.error({
        event: 'magic_link_email_send_error',
        error: emailError instanceof Error ? emailError.message : 'Unknown error',
        stack: emailError instanceof Error ? emailError.stack : undefined,
      });

      // Audit log for failed attempt
      await createAuditLog({
        action: 'LOGIN',
        resource: 'PatientAuth',
        resourceId: patientUser.id,
        details: {
          method: 'magic_link',
          error: 'Email send failed',
        },
        success: false,
      });

      return NextResponse.json(
        { error: 'Failed to send magic link email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Magic link sent to your email. Please check your inbox.'
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'magic_link_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to send magic link',
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error'
        })
      },
      { status: 500 }
    );
  }
  },
  {
    // ✅ SECURITY: Stricter rate limiting to prevent email spam
    // Limits: 3 attempts per hour per IP address
    rateLimit: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // 3 attempts per hour
    },
  }
);
