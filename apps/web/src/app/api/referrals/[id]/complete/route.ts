export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const bodySchema = z.object({
  outcomeSummary: z.string().min(5).max(2000),
});

/**
 * POST /api/referrals/[id]/complete — recipient marks an ACCEPTED referral
 * as completed after the patient visit. Awards patient care points (if a
 * patientId is attached) — +50 base, +25 extra for cross-modality.
 *
 * Point award rules are patient-facing only. Physicians earn reputation
 * stats, not spendable value, per CFM Art. 59 / Stark / AKS.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      const userId = context.user?.id;
      if (!id || !userId) return NextResponse.json({ error: 'Missing id or user' }, { status: 400 });

      const body = await request.json();
      const { outcomeSummary } = bodySchema.parse(body);

      const myPhysician = await prisma.physicianCatalog.findFirst({
        where: { claimedByUserId: userId },
        select: { id: true },
      });
      if (!myPhysician) {
        return NextResponse.json({ error: 'Not linked to a physician profile' }, { status: 403 });
      }

      const ref = await prisma.providerReferral.findUnique({
        where: { id },
        select: {
          id: true,
          toPhysicianId: true,
          status: true,
          patientId: true,
          isCrossModality: true,
        },
      });
      if (!ref) return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
      if (ref.toPhysicianId !== myPhysician.id) {
        return NextResponse.json({ error: 'Only the recipient can complete this referral' }, { status: 403 });
      }
      if (ref.status !== 'ACCEPTED') {
        return NextResponse.json(
          { error: `Cannot complete — current status is ${ref.status}` },
          { status: 409 },
        );
      }

      const updated = await prisma.providerReferral.update({
        where: { id },
        data: { status: 'COMPLETED', completedAt: new Date(), outcomeSummary },
        select: { id: true, status: true, completedAt: true, outcomeSummary: true, isCrossModality: true },
      });

      prisma.providerReferralStats.upsert({
        where: { physicianId: myPhysician.id },
        create: { physicianId: myPhysician.id, completedCount: 1 },
        update: { completedCount: { increment: 1 } },
      }).catch(() => {});

      // Patient-facing points — only if patient opted in with patientId
      let pointsAwarded = 0;
      if (ref.patientId) {
        const base = 50;
        const bonus = ref.isCrossModality ? 25 : 0;
        pointsAwarded = base + bonus;

        await prisma.$transaction(async (tx) => {
          const wallet = await tx.patientCarePoints.upsert({
            where: { patientId: ref.patientId! },
            create: {
              patientId: ref.patientId!,
              balance: pointsAwarded,
              lifetimeEarned: pointsAwarded,
            },
            update: {
              balance: { increment: pointsAwarded },
              lifetimeEarned: { increment: pointsAwarded },
            },
          });

          await tx.patientPointsLedgerEntry.create({
            data: {
              patientId: ref.patientId!,
              referralId: ref.id,
              eventType: ref.isCrossModality ? 'CROSS_MODALITY_BONUS' : 'REFERRAL_COMPLETED_BONUS',
              points: pointsAwarded,
              balanceAfter: wallet.balance,
              description: ref.isCrossModality
                ? `Completed cross-modality referral (+${base} base, +${bonus} cross-modality bonus)`
                : `Completed referral visit (+${base})`,
            },
          });
        });
      }

      return NextResponse.json({
        data: updated,
        pointsAwarded,
        message: pointsAwarded
          ? `Referral completed. Patient earned ${pointsAwarded} care points.`
          : 'Referral completed.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    audit: { action: 'referral_complete', resource: 'ProviderReferral' },
    skipCsrf: true,
  },
);
