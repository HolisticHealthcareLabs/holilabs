/**
 * PATCH /api/providers/[id] — Update provider fields (calcomUsername, isActive, etc.)
 * DELETE /api/providers/[id] — Soft-delete (set isActive = false)
 *
 * CYRUS: orgId scope enforced — provider must belong to session org.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { verifyBearerToken } from '@/lib/auth/verify-token';
import { createNetworkAuditLog } from '@/lib/security/audit';

const PatchProviderSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  calcomUsername: z.string().optional(),
  calcomEventSlug: z.string().optional(),
  phone: z.string().optional(),
  addressCity: z.string().optional(),
  addressState: z.string().max(2).optional(),
  acceptedPlans: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
}).strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const provider = await prisma.networkProvider.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });
  if (!provider) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = PatchProviderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Validation failed', details: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await prisma.networkProvider.update({
    where: { id: params.id },
    data: parsed.data,
  });

  createNetworkAuditLog({
    action: 'UPDATE', resource: 'NetworkProvider', resourceId: params.id,
    orgId: session.orgId, actorId: session.userId, actorType: 'CLINICIAN', success: true,
  });

  return NextResponse.json({ success: true, provider: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await verifyBearerToken(request.headers.get('authorization'));
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const provider = await prisma.networkProvider.findFirst({
    where: { id: params.id, orgId: session.orgId },
  });
  if (!provider) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  // Soft-delete only — preserve for audit trail and referral history
  await prisma.networkProvider.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  createNetworkAuditLog({
    action: 'UPDATE', resource: 'NetworkProvider', resourceId: params.id,
    orgId: session.orgId, actorId: session.userId, actorType: 'CLINICIAN', success: true,
    detail: 'soft-deleted (isActive=false)',
  });

  return NextResponse.json({ success: true });
}
