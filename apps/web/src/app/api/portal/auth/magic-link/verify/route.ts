/**
 * Verify Magic Link API
 *
 * POST /api/portal/auth/magic-link/verify - Verify magic link token and create session
 *
 * @security Rate limited to 5 attempts per 15 minutes per IP to prevent brute force attacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { createPatientSession } from '@/lib/auth/patient-session';
import { logger } from '@/lib/logger';
import { createPublicRoute, ApiContext } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const POST = createPublicRoute(
  async (request: NextRequest, context: ApiContext) => {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Hash the token to lookup in database
    const tokenHash = hashToken(token);

    // Find magic link
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
      return NextResponse.json(
        { error: 'Invalid or expired magic link' },
        { status: 401 }
      );
    }

    // Check if already used
    if (magicLink.usedAt) {
      return NextResponse.json(
        { error: 'Magic link has already been used' },
        { status: 401 }
      );
    }

    // Check if expired
    if (new Date() > new Date(magicLink.expiresAt)) {
      return NextResponse.json(
        { error: 'Magic link has expired' },
        { status: 401 }
      );
    }

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { usedAt: new Date() },
    });

    // Update patient user last login
    await prisma.patientUser.update({
      where: { id: magicLink.patientId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request.headers.get('x-forwarded-for') || 'unknown',
        emailVerifiedAt: magicLink.patientUser.emailVerifiedAt || new Date(),
        loginAttempts: 0, // Reset login attempts on successful login
      },
    });

    // Create patient session with JWT
    await createPatientSession(
      magicLink.patientUser.id,
      magicLink.patientUser.patient.id,
      magicLink.patientUser.email,
      false // rememberMe = false for magic links
    );

    // HIPAA Audit Log: Successful patient login
    await createAuditLog({
      action: 'LOGIN',
      resource: 'PatientAuth',
      resourceId: magicLink.patientUser.id,
      details: {
        method: 'magic_link',
        patientId: magicLink.patientUser.patient.id,
        sessionCreated: true,
      },
      success: true,
      request,
    });

    return NextResponse.json(
      {
        success: true,
        patient: {
          id: magicLink.patientUser.patient.id,
          firstName: magicLink.patientUser.patient.firstName,
          lastName: magicLink.patientUser.patient.lastName,
          mrn: magicLink.patientUser.patient.mrn,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'portal_magic_link_verify_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      {
        error: 'Failed to verify magic link',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
  },
  {
    // ✅ SECURITY: Rate limiting to prevent brute force magic link attacks
    // Limits: 5 attempts per 15 minutes per IP address
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // 5 attempts per 15 minutes
    },
  }
);
