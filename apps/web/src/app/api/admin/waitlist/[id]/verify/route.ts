import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Public endpoint — called by the onboarding welcome page to verify a lead
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

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
}
