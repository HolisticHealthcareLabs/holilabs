/**
 * GET  /api/providers — List active providers for the authenticated org
 * POST /api/providers — Create a new NetworkProvider
 *
 * CYRUS: Tenant-scoped — orgId is always taken from the verified session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { verifyBearerToken } from '@/lib/auth/verify-token';
import { createLogger } from '@/lib/logger';
import { createNetworkAuditLog } from '@/lib/security/audit';

const SPECIALTY_VALUES = [
  'CARDIOLOGY', 'DERMATOLOGY', 'ORTHOPEDICS', 'NEUROLOGY', 'GASTROENTEROLOGY',
  'OPHTHALMOLOGY', 'ENDOCRINOLOGY', 'GYNECOLOGY', 'UROLOGY', 'GENERAL_SURGERY',
] as const;

const CreateProviderSchema = z.object({
  name: z.string().min(2).max(120),
  specialty: z.enum(SPECIALTY_VALUES),
  crmNumber: z.string().min(1).max(30),
  calcomUsername: z.string().min(1).optional(),
  calcomEventSlug: z.string().min(1).optional(),
  phone: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  acceptedPlans: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true';

  const providers = await prisma.networkProvider.findMany({
    where: {
      orgId: session.orgId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ specialty: 'asc' }, { name: 'asc' }],
  });

  createNetworkAuditLog({
    action: 'READ', resource: 'NetworkProvider', resourceId: `org:${session.orgId}`,
    orgId: session.orgId, actorId: session.userId, actorType: 'CLINICIAN', success: true,
    detail: `count=${providers.length}`,
  });

  return NextResponse.json({ success: true, providers });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const log = createLogger({ service: 'api/providers', method: 'POST' });
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const provider = await prisma.networkProvider.create({
    data: {
      orgId: session.orgId,
      name: parsed.data.name,
      specialty: parsed.data.specialty,
      crmNumber: parsed.data.crmNumber,
      calcomUsername: parsed.data.calcomUsername ?? null,
      calcomEventSlug: parsed.data.calcomEventSlug ?? null,
      phone: parsed.data.phone ?? null,
      addressCity: parsed.data.addressCity ?? null,
      addressState: parsed.data.addressState ?? null,
      acceptedPlans: parsed.data.acceptedPlans,
      isActive: true,
    },
  });

  createNetworkAuditLog({
    action: 'CREATE', resource: 'NetworkProvider', resourceId: provider.id,
    orgId: session.orgId, actorId: session.userId, actorType: 'CLINICIAN', success: true,
  });
  log.info({ providerId: provider.id, orgId: session.orgId }, 'Provider created');

  return NextResponse.json({ success: true, provider }, { status: 201 });
}
