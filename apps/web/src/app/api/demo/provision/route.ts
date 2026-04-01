/**
 * Demo Provision Endpoint
 *
 * Returns pre-seeded demo credentials. The full ephemeral workspace
 * provisioning requires Workspace/WorkspaceMember/Discipline/TenantDiscipline
 * models which are not yet in the schema — this lightweight version uses
 * existing seeded users so the demo flow works immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

const DEMO_CREDENTIALS = {
  email: 'dr.silva@holilabs.xyz',
  password: 'Cortex2026!',
};

export const POST = createPublicRoute(async (request: NextRequest): Promise<NextResponse> => {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Demo provision is disabled in production' }, { status: 404 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: DEMO_CREDENTIALS.email },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Demo user not found. Run prisma db seed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      redirectTo: '/dashboard',
      credentials: DEMO_CREDENTIALS,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to provision demo environment' },
      { status: 500 }
    );
  }
});
