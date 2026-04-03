/**
 * POST /api/auth/webauthn/register-options
 *
 * Generates WebAuthn registration options for the authenticated user.
 * Stores the challenge in Redis / memory store (TTL 300s).
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { storeRegistrationChallenge } from '@/lib/auth/webauthn-challenge-store';

export const dynamic = 'force-dynamic';

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'Holilabs';
const RP_ID = process.env.WEBAUTHN_RP_ID ?? 'localhost';

export const POST = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    const userId = context.user.id as string;

    // Fetch existing credentials to exclude them from the ceremony
    const existingCredentials = await prisma.webAuthnCredential.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: context.user.email as string,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports as AuthenticatorTransport[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });

    await storeRegistrationChallenge(userId, options.challenge);

    return NextResponse.json(options);
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'], skipCsrf: false }
);
