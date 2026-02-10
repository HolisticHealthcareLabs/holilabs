import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { _prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getOrCreateWorkspaceForUser } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

export type OnboardingProfile = {
  persona?: 'CLINIC_OWNER' | 'HOSPITAL_IT' | 'CLINICIAN' | 'OTHER';
  orgSize?: '1-5' | '6-25' | '26-100' | '101-500' | '500+';
  deployment?: 'MANUAL' | 'MDM' | 'UNKNOWN';
  osMix?: 'MOSTLY_MAC' | 'MOSTLY_WINDOWS' | 'MIXED' | 'UNKNOWN';
  ehr?: 'TASY' | 'MV_SOUL' | 'WARELINE' | 'PHILIPS_TASY' | 'EPIC' | 'CERNER' | 'OTHER' | 'UNKNOWN';
  goal?: 'PILOT' | 'ROLL_OUT' | 'EVALUATE' | 'UNKNOWN';
  complianceCountry?: 'BOLIVIA' | 'BRAZIL' | 'ARGENTINA' | 'MEXICO' | 'COLOMBIA' | 'CHILE' | 'PERU' | 'OTHER' | 'UNKNOWN';
  insurerFocus?: string;
  protocolMode?: 'DETERMINISTIC_100' | 'HYBRID_70_30' | 'UNKNOWN';
};

function mergeWorkspaceMetadata(
  existing: unknown,
  profile: OnboardingProfile | null
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  return {
    ...base,
    onboardingProfile: profile,
    onboardingProfileUpdatedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 501 });

  const { workspaceId } = await getOrCreateWorkspaceForUser(userId);

  const ws = await _prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });

  const profile =
    ws?.metadata && typeof ws.metadata === 'object' && ws.metadata !== null
      ? (ws.metadata as any).onboardingProfile
      : null;

  return NextResponse.json({ success: true, data: profile ?? null }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 501 });

  const body = (await req.json().catch(() => null)) as { profile?: OnboardingProfile } | null;
  const profile = body?.profile ?? null;

  const { workspaceId } = await getOrCreateWorkspaceForUser(userId);

  const existing = await _prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });

  await _prisma.workspace.update({
    where: { id: workspaceId },
    data: { metadata: mergeWorkspaceMetadata(existing?.metadata ?? null, profile) },
  });

  return NextResponse.json({ success: true }, { status: 200 });
}

