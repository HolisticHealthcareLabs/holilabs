import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const userId = context.user!.id;

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId },
      include: { workspace: { select: { name: true } } },
    });

    return NextResponse.json({
      workspaceName: membership?.workspace?.name || null,
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    skipCsrf: true,
  }
);
