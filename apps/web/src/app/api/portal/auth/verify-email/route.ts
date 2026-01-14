/**
 * Email Verification API
 *
 * GET /api/portal/auth/verify-email?token=xxx - Verify patient email address
 *
 * Features:
 * - Token validation using magic link infrastructure
 * - Email verification confirmation
 * - Automatic session creation after verification
 * - Redirect to patient portal
 * - Rate limiting
 * - HIPAA audit logging
 *
 * @security Token-based verification with expiration
 * @compliance HIPAA §164.312(a)(2)(i) - Email verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { createPatientSession } from '@/lib/auth/patient-session';
import { createAuditLog } from '@/lib/audit';
import { logger } from '@/lib/logger';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const GET = createPublicRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const token = searchParams.get('token');

      if (!token) {
        logger.warn({
          event: 'email_verification_missing_token',
        });

        return NextResponse.redirect(
          new URL('/portal/login?error=invalid_verification_token', request.url)
        );
      }

      // Hash the token to lookup in database
      const tokenHash = hashToken(token);

      // Find magic link (used for email verification)
      const magicLink = await prisma.magicLink.findUnique({
        where: { tokenHash },
        include: {
          patientUser: {
            include: {
              patient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  mrn: true,
                },
              },
            },
          },
        },
      });

      if (!magicLink) {
        logger.warn({
          event: 'email_verification_invalid_token',
        });

        return NextResponse.redirect(
          new URL('/portal/login?error=invalid_verification_token', request.url)
        );
      }

      // Check if already used
      if (magicLink.usedAt) {
        logger.info({
          event: 'email_verification_already_used',
          patientUserId: magicLink.patientUser.id,
        });

        // If email already verified, just redirect to login
        if (magicLink.patientUser.emailVerifiedAt) {
          return NextResponse.redirect(
            new URL('/portal/login?message=already_verified', request.url)
          );
        }

        return NextResponse.redirect(
          new URL('/portal/login?error=verification_token_used', request.url)
        );
      }

      // Check if expired
      if (new Date() > new Date(magicLink.expiresAt)) {
        logger.warn({
          event: 'email_verification_expired',
          patientUserId: magicLink.patientUser.id,
        });

        return NextResponse.redirect(
          new URL('/portal/login?error=verification_token_expired', request.url)
        );
      }

      // Mark magic link as used
      await prisma.magicLink.update({
        where: { id: magicLink.id },
        data: { usedAt: new Date() },
      });

      // Check if email is already verified
      const alreadyVerified = !!magicLink.patientUser.emailVerifiedAt;

      // Mark email as verified
      await prisma.patientUser.update({
        where: { id: magicLink.patientUser.id },
        data: {
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
          lastLoginIp: request.headers.get('x-forwarded-for') || 'unknown',
          loginAttempts: 0, // Reset login attempts
        },
      });

      // Create patient session with JWT (auto-login after verification)
      await createPatientSession(
        magicLink.patientUser.id,
        magicLink.patientUser.patient.id,
        magicLink.patientUser.email,
        false // rememberMe = false for email verification
      );

      // HIPAA Audit Log: Email verification and auto-login
      await createAuditLog({
        action: 'UPDATE',
        resource: 'PatientUser',
        resourceId: magicLink.patientUser.id,
        details: {
          action: 'email_verification',
          patientId: magicLink.patientUser.patient.id,
          alreadyVerified,
          autoLogin: true,
        },
        success: true,
      });

      logger.info({
        event: 'email_verification_success',
        patientUserId: magicLink.patientUser.id,
        patientId: magicLink.patientUser.patient.id,
        alreadyVerified,
      });

      // Redirect to portal dashboard with success message
      return NextResponse.redirect(
        new URL('/portal/dashboard?verified=true', request.url)
      );
    } catch (error) {
      logger.error({
        event: 'email_verification_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      return NextResponse.redirect(
        new URL('/portal/login?error=verification_failed', request.url)
      );
    }
  },
  {
    // ✅ SECURITY: Rate limiting to prevent token brute force
    // Limits: 10 verification attempts per 15 minutes per IP
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10, // 10 verification attempts per 15 minutes
    },
  }
);
