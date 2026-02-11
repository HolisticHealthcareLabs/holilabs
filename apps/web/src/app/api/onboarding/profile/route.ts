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

const PERSONA_VALUES = ['CLINIC_OWNER', 'HOSPITAL_IT', 'CLINICIAN', 'OTHER'] as const;
const ORG_SIZE_VALUES = ['1-5', '6-25', '26-100', '101-500', '500+'] as const;
const DEPLOYMENT_VALUES = ['MANUAL', 'MDM', 'UNKNOWN'] as const;
const OS_MIX_VALUES = ['MOSTLY_MAC', 'MOSTLY_WINDOWS', 'MIXED', 'UNKNOWN'] as const;
const EHR_VALUES = [
  'TASY',
  'MV_SOUL',
  'WARELINE',
  'PHILIPS_TASY',
  'EPIC',
  'CERNER',
  'OTHER',
  'UNKNOWN',
] as const;
const GOAL_VALUES = ['PILOT', 'ROLL_OUT', 'EVALUATE', 'UNKNOWN'] as const;
const COMPLIANCE_COUNTRY_VALUES = [
  'BOLIVIA',
  'BRAZIL',
  'ARGENTINA',
  'MEXICO',
  'COLOMBIA',
  'CHILE',
  'PERU',
  'OTHER',
  'UNKNOWN',
] as const;
const PROTOCOL_MODE_VALUES = ['DETERMINISTIC_100', 'HYBRID_70_30', 'UNKNOWN'] as const;

function asEnumValue<T extends readonly string[]>(value: unknown, allowed: T): T[number] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T[number]) : undefined;
}

function normalizeProtocolMode(value: unknown): OnboardingProfile['protocolMode'] | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toUpperCase();

  if (normalized === 'DETERMINISTIC_100' || normalized === 'DETERMINISTIC-FIRST') {
    return 'DETERMINISTIC_100';
  }
  if (
    normalized === 'HYBRID_70_30' ||
    normalized === 'HYBRID' ||
    normalized === 'HYBRID-70-30'
  ) {
    return 'HYBRID_70_30';
  }
  if (normalized === 'UNKNOWN') {
    return 'UNKNOWN';
  }
  return undefined;
}

function sanitizeInsurerFocus(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, 120);
  return trimmed;
}

function sanitizeProfile(input: unknown): OnboardingProfile | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const profile: OnboardingProfile = {};

  const persona = asEnumValue(raw.persona, PERSONA_VALUES);
  const orgSize = asEnumValue(raw.orgSize, ORG_SIZE_VALUES);
  const deployment = asEnumValue(raw.deployment, DEPLOYMENT_VALUES);
  const osMix = asEnumValue(raw.osMix, OS_MIX_VALUES);
  const ehr = asEnumValue(raw.ehr, EHR_VALUES);
  const goal = asEnumValue(raw.goal, GOAL_VALUES);
  const complianceCountry = asEnumValue(raw.complianceCountry, COMPLIANCE_COUNTRY_VALUES);
  const protocolMode = normalizeProtocolMode(raw.protocolMode);
  const insurerFocus = sanitizeInsurerFocus(raw.insurerFocus);

  if (persona) profile.persona = persona;
  if (orgSize) profile.orgSize = orgSize;
  if (deployment) profile.deployment = deployment;
  if (osMix) profile.osMix = osMix;
  if (ehr) profile.ehr = ehr;
  if (goal) profile.goal = goal;
  if (complianceCountry) profile.complianceCountry = complianceCountry;
  if (protocolMode) profile.protocolMode = protocolMode;
  if (insurerFocus !== undefined) profile.insurerFocus = insurerFocus;

  return profile;
}

function profileFromMetadata(metadata: unknown): OnboardingProfile | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const meta = metadata as Record<string, unknown>;
  const nested = sanitizeProfile(meta.onboardingProfile);

  if (nested) {
    return nested;
  }

  const legacy = sanitizeProfile({
    complianceCountry: meta.complianceCountry,
    insurerFocus: meta.insurerFocus,
    protocolMode: meta.protocolMode,
  });

  return legacy && Object.keys(legacy).length > 0 ? legacy : null;
}

function mergeProfiles(current: OnboardingProfile | null, incoming: OnboardingProfile | null) {
  return {
    ...(current ?? {}),
    ...(incoming ?? {}),
  };
}

function mergeWorkspaceMetadata(
  existing: unknown,
  profile: OnboardingProfile | null
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  const rolloutContext = {
    complianceCountry: profile?.complianceCountry ?? 'UNKNOWN',
    insurerFocus: profile?.insurerFocus ?? '',
    protocolMode: profile?.protocolMode ?? 'UNKNOWN',
    deterministicFirst: profile?.protocolMode === 'DETERMINISTIC_100',
  };

  return {
    ...base,
    onboardingProfile: profile,
    complianceCountry: rolloutContext.complianceCountry,
    insurerFocus: rolloutContext.insurerFocus,
    protocolMode: rolloutContext.protocolMode,
    deterministicFirst: rolloutContext.deterministicFirst,
    rolloutContext,
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
      ? profileFromMetadata(ws.metadata)
      : null;

  return NextResponse.json(
    {
      success: true,
      data: profile ?? null,
      context: profile
        ? {
            complianceCountry: profile.complianceCountry ?? 'UNKNOWN',
            insurerFocus: profile.insurerFocus ?? '',
            protocolMode: profile.protocolMode ?? 'UNKNOWN',
            deterministicFirst: profile.protocolMode === 'DETERMINISTIC_100',
          }
        : null,
    },
    { status: 200 }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!_prisma) return NextResponse.json({ error: 'DB unavailable' }, { status: 501 });

  const body = (await req.json().catch(() => null)) as
    | { profile?: OnboardingProfile | null }
    | OnboardingProfile
    | null;
  const payload =
    body && typeof body === 'object' && 'profile' in body
      ? ((body as { profile?: unknown }).profile ?? null)
      : body;
  const incomingProfile = sanitizeProfile(payload);

  const { workspaceId } = await getOrCreateWorkspaceForUser(userId);

  const existing = await _prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { metadata: true },
  });
  const currentProfile = profileFromMetadata(existing?.metadata ?? null);
  const profile = mergeProfiles(currentProfile, incomingProfile);

  await _prisma.workspace.update({
    where: { id: workspaceId },
    data: { metadata: mergeWorkspaceMetadata(existing?.metadata ?? null, profile) },
  });

  return NextResponse.json({ success: true, data: profile }, { status: 200 });
}

