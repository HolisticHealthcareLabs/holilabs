export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const bodySchema = z.object({
  scheduledFor: z.string().datetime().optional(),
});

/**
 * POST /api/referrals/[id]/accept — recipient accepts a PENDING referral.
 * Optionally records a scheduled appointment time.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      const userId = context.user?.id;
      if (!id || !userId) {
        return NextResponse.json({ error: 'Missing id or user' }, { status: 400 });
      }

      const body = await request.json().catch(() => ({}));
      const { scheduledFor } = bodySchema.parse(body);

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
        return NextResponse.json({ error: 'Only the recipient can accept this referral' }, { status: 403 });
      }
      if (ref.status !== 'PENDING') {
        return NextResponse.json(
          { error: `Cannot accept — current status is ${ref.status}` },
          { status: 409 },
        );
      }

      const updated = await prisma.providerReferral.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        },
        select: { id: true, status: true, acceptedAt: true, scheduledFor: true },
      });

      prisma.providerReferralStats.upsert({
        where: { physicianId: myPhysician.id },
        create: { physicianId: myPhysician.id, acceptedCount: 1 },
        update: { acceptedCount: { increment: 1 } },
      }).catch(() => {});

      return NextResponse.json({ data: updated, message: 'Referral accepted.' });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    audit: { action: 'referral_accept', resource: 'ProviderReferral' },
    skipCsrf: true,
  },
);
