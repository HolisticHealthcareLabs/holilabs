/**
 * POST /api/auth/webauthn/sign-options
 *
 * Generates WebAuthn authentication options for prescription signing.
 * Stores { challenge, prescriptionNonce } in the sign challenge store (TTL 120s).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { storeSignChallenge } from '@/lib/auth/webauthn-challenge-store';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user.id as string;

    let body: { prescriptionNonce?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (!body.prescriptionNonce) {
      return NextResponse.json({ error: 'Missing prescriptionNonce' }, { status: 400 });
    }

    const credentials = await prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: 'No registered credentials. Register a device first.' },
        { status: 400 }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      userVerification: 'preferred',
      allowCredentials: credentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransport[],
      })),
    });

    await storeSignChallenge(userId, {
      challenge: options.challenge,
      prescriptionNonce: body.prescriptionNonce,
    });

    return NextResponse.json(options);
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'], skipCsrf: false }
);
