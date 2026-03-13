/**
 * POST /api/directory/claim
 *
 * A physician in PhysicianCatalog claims their profile and joins an org's
 * Holi referral network, creating a NetworkProviderLink.
 *
 * Body:
 *   physicianId     — PhysicianCatalog.id (CUID)
 *   orgId           — the clinic org that is onboarding this doctor
 *   calcomUsername  — their Cal.com username (optional)
 *   calcomEventSlug — their Cal.com event slug (optional)
 *   acceptedPlans   — string[] of insurance plans they accept
 *   verificationCode — future: OTP sent to their registered phone (placeholder)
 *
 * Auth: Requires org clinician session (Bearer token).
 * The doctor must be a real physician in the catalog (validates physicianId).
 *
 * Future: Add OTP/SMS verification using the physician's registered phone
 * from the CFM/SISA registry to prevent impersonation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { verifyBearerToken } from '@/lib/auth/verify-token';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

const ClaimSchema = z.object({
  physicianId: z.string().min(1),
  calcomUsername: z.string().optional(),
  calcomEventSlug: z.string().optional(),
  acceptedPlans: z.array(z.string()).default([]),
});

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'api/directory/claim' });

  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { physicianId, calcomUsername, calcomEventSlug, acceptedPlans } = parsed.data;

  // Verify the physician exists in the global catalog
  const physician = await prisma.physicianCatalog.findFirst({
    where: { id: physicianId, publicProfileEnabled: true, isRegistryActive: true },
  });

  if (!physician) {
    return NextResponse.json(
      { success: false, error: 'Physician not found in registry' },
      { status: 404 }
    );
  }

  // Check if already claimed by this org
  const existing = await prisma.networkProviderLink.findFirst({
    where: { orgId: session.orgId, physicianId },
  });

  if (existing) {
    if (existing.isActive) {
      return NextResponse.json({ success: true, link: existing, alreadyClaimed: true });
    }
    // Re-activate
    const updated = await prisma.networkProviderLink.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        calcomUsername: calcomUsername ?? existing.calcomUsername,
        calcomEventSlug: calcomEventSlug ?? existing.calcomEventSlug,
        acceptedPlans: acceptedPlans.length > 0 ? acceptedPlans : existing.acceptedPlans,
        claimedAt: existing.claimedAt ?? new Date(),
      },
    });
    return NextResponse.json({ success: true, link: updated, reactivated: true });
  }

  // Create new NetworkProviderLink
  const link = await prisma.networkProviderLink.create({
    data: {
      id: cuid(),
      orgId: session.orgId,
      physicianId,
      calcomUsername: calcomUsername ?? null,
      calcomEventSlug: calcomEventSlug ?? null,
      acceptedPlans,
      isActive: true,
      claimedAt: new Date(),
    },
  });

  createNetworkAuditLog({
    action: 'CREATE',
    resource: 'NetworkProvider',
    resourceId: link.id,
    orgId: session.orgId,
    actorId: session.userId,
    actorType: 'CLINICIAN',
    success: true,
    detail: `Claimed PhysicianCatalog:${physicianId} (${physician.name})`,
  });

  log.info(
    { physicianId, orgId: session.orgId, physicianName: physician.name },
    'Physician profile claimed'
  );

  return NextResponse.json({ success: true, link }, { status: 201 });
}
