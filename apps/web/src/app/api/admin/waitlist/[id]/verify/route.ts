import { NextRequest, NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';

// Public endpoint — called by the onboarding welcome page to verify a lead
export const GET = createPublicRoute(async (
  _request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>> }
) => {
  const params = await Promise.resolve(context.params ?? {});
  const id = params.id;

  if (!id) {
    return NextResponse.json({ valid: false });
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      companyName: true,
      plan: true,
      status: true,
    },
  });

  if (!entry || entry.status !== 'APPROVED') {
    return NextResponse.json({ valid: false });
  }

  return NextResponse.json({
    valid: true,
    lead: {
      name: [entry.firstName, entry.lastName].filter(Boolean).join(' ') || null,
      email: entry.email,
      company: entry.companyName,
      plan: entry.plan,
    },
  });
});
