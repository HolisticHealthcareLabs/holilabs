export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const bodySchema = z.object({
  reason: z.string().min(5).max(500),
});

/**
 * POST /api/referrals/[id]/decline — recipient declines a PENDING referral
 * with a short reason recorded for audit.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      const userId = context.user?.id;
      if (!id || !userId) return NextResponse.json({ error: 'Missing id or user' }, { status: 400 });

      const body = await request.json();
      const { reason } = bodySchema.parse(body);

      const myPhysician = await prisma.physicianCatalog.findFirst({
        where: { claimedByUserId: userId },
        select: { id: true },
      });
      if (!myPhysician) {
        return NextResponse.json({ error: 'Not linked to a physician profile' }, { status: 403 });
      }

      const ref = await prisma.providerReferral.findUnique({
        where: { id },
        select: { id: true, toPhysicianId: true, status: true },
      });
      if (!ref) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
      if (ref.toPhysicianId !== myPhysician.id) {
        return NextResponse.json({ error: 'Only the recipient can decline this referral' }, { status: 403 });
      }
      if (ref.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot decline — current status is ${ref.status}` },
          { status: 409 },
        );
      }

      const updated = await prisma.providerReferral.update({
        where: { id },
        data: { status: 'DECLINED', declinedAt: new Date(), declineReason: reason },
        select: { id: true, status: true, declinedAt: true, declineReason: true },
      });

      prisma.providerReferralStats.upsert({
        where: { physicianId: myPhysician.id },
        create: { physicianId: myPhysician.id, declinedCount: 1 },
        update: { declinedCount: { increment: 1 } },
      }).catch(() => {});

      return NextResponse.json({ data: updated, message: 'Referral declined.' });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    audit: { action: 'referral_decline', resource: 'ProviderReferral' },
    skipCsrf: true,
  },
);
