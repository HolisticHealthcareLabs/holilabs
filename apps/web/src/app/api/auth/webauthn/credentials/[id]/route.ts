/**
 * DELETE /api/auth/webauthn/credentials/[id]
 * Revoke (delete) a WebAuthn credential belonging to the authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const DELETE = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    const userId = context.user.id as string;
    const credentialId = context.params?.id as string;

    if (!credentialId) {
      return NextResponse.json({ error: 'Missing credential id' }, { status: 400 });
    }

    const existing = await prisma.webAuthnCredential.findUnique({
      where: { id: credentialId },
      select: { userId: true },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    await prisma.webAuthnCredential.delete({ where: { id: credentialId } });

    return NextResponse.json({ success: true });
  },
  { roles: ['ADMIN', 'CLINICIAN', 'PHYSICIAN', 'NURSE'], skipCsrf: false }
);
