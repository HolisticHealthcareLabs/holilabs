/**
 * Demo Provision Endpoint
 *
 * Creates a unique ephemeral User per demo session so that biometric
 * credentials (WebAuthn) are isolated between visitors. The isEphemeral
 * flag marks these rows for eventual cleanup.
 *
 * POST /api/demo/provision → { success, credentials, user }
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEMO_PASSWORD = 'Cortex2026!';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Demo provision is disabled in production' }, { status: 404 });
  }

  try {
    const slug = crypto.randomBytes(4).toString('hex');
    const email = `demo-${slug}@holilabs.xyz`;

    const user = await prisma.user.create({
      data: {
        email,
        firstName: 'Dr. Demo',
        lastName: slug.toUpperCase(),
        role: 'CLINICIAN',
        isEphemeral: true,
        onboardingCompleted: true,
      },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    return NextResponse.json({
      success: true,
      redirectTo: '/dashboard',
      credentials: { email, password: DEMO_PASSWORD },
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to provision demo environment' },
      { status: 500 },
    );
  }
}
