/**
 * POST /api/auth/webauthn/verify-registration
 *
 * Verifies the WebAuthn registration response and persists the credential.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import {
  getRegistrationChallenge,
  deleteRegistrationChallenge,
} from '@/lib/auth/webauthn-challenge-store';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const ORIGIN = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user.id as string;

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const expectedChallenge = await getRegistrationChallenge(userId);
    if (!expectedChallenge) {
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        requireUserVerification: true, // CVI-001: enforce biometric/PIN for non-repudiation
      });
    } catch (err) {
      logger.warn({ event: 'webauthn_registration_verify_failed', error: String(err) });
      return NextResponse.json({ error: 'Verification failed', details: String(err) }, { status: 400 });
    }

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Registration not verified' }, { status: 400 });
    }

    await deleteRegistrationChallenge(userId);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const name = body.deviceName ?? 'Dispositivo';

    const saved = await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: body.response?.transports ?? [],
        name,
      },
      select: { id: true, name: true, deviceType: true, createdAt: true },
    });

    logger.info({ event: 'webauthn_credential_created', userId });

    return NextResponse.json({ verified: true, credential: saved });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'], skipCsrf: false }
);
