/**
 * POST /api/auth/webauthn/verify-signature
 *
 * Verifies the WebAuthn authentication assertion, updates the credential counter,
 * and issues a short-lived JWT (signatureToken) encoding { userId, prescriptionNonce }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import {
  getSignChallenge,
  deleteSignChallenge,
} from '@/lib/auth/webauthn-challenge-store';
import { issueWebAuthnToken } from '@/lib/auth/webauthn-token';
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

    const signPayload = await getSignChallenge(userId);
    if (!signPayload) {
      return NextResponse.json({ error: 'Challenge expired or not found' }, { status: 400 });
    }

    // Locate the credential record
    const credentialRecord = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: body.id },
    });

    if (!credentialRecord || credentialRecord.userId !== userId) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: signPayload.challenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: credentialRecord.credentialId,
          publicKey: new Uint8Array(credentialRecord.publicKey),
          counter: Number(credentialRecord.counter),
          transports: credentialRecord.transports as AuthenticatorTransport[],
        },
        requireUserVerification: true, // CVI-001: enforce biometric/PIN for prescription signing
      });
    } catch (err) {
      logger.warn({ event: 'webauthn_sign_verify_failed', error: String(err) });
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    if (!verification.verified) {
      return NextResponse.json({ error: 'Assertion not verified' }, { status: 400 });
    }

    await deleteSignChallenge(userId);

    // Update counter to prevent replay attacks
    await prisma.webAuthnCredential.update({
      where: { id: credentialRecord.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    const signatureToken = await issueWebAuthnToken(userId, signPayload.prescriptionNonce);

    logger.info({ event: 'webauthn_signature_issued', userId });

    return NextResponse.json({ signatureToken });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'], skipCsrf: false }
);
