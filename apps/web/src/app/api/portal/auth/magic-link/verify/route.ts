/**
 * Verify Magic Link API
 *
 * POST /api/portal/auth/magic-link/verify - Verify magic link token and create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
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
      where: { id: magicLink.patientUserId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: request.headers.get('x-forwarded-for') || 'unknown',
        emailVerifiedAt: magicLink.patientUser.emailVerifiedAt || new Date(),
        loginAttempts: 0, // Reset login attempts on successful login
      },
    });

    // Generate session token
    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Set session cookie
    cookies().set('patient_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiry,
      path: '/',
    });

    // Store session in cookie (in production, use Redis or database)
    const sessionData = {
      patientUserId: magicLink.patientUser.id,
      patientId: magicLink.patientUser.patient.id,
      email: magicLink.patientUser.email,
      expiresAt: sessionExpiry.toISOString(),
    };

    cookies().set('patient_session_data', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiry,
      path: '/',
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
    console.error('Error verifying magic link:', error);
    return NextResponse.json(
      {
        error: 'Failed to verify magic link',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
