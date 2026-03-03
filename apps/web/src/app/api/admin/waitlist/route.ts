import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';

export const GET = createProtectedRoute(
  async () => {
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ entries });
  },
  { roles: ['ADMIN' as any], skipCsrf: true }
);
