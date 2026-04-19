export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

/**
 * Referral disclosure shown to the patient (CFM Art. 59 / Stark / AKS compliance).
 * The exact wording is recorded on the ProviderReferral row so disputes can be
 * resolved against the text the patient actually saw at the time.
 */
const DEFAULT_DISCLOSURE =
  'You are being referred based on clinical judgment. No financial compensation or benefit is exchanged between providers for this referral. You may choose any qualified practitioner and are free to decline this suggestion.';

const createSchema = z.object({
  toPhysicianId: z.string().cuid(),
  reason: z.string().min(5).max(2000),
  initiationSource: z.enum([
    'DOCTOR_VISIT', 'ASYNC_MESSAGING', 'PATIENT_REQUEST', 'AI_SUGGESTION',
  ]),
  patientId: z.string().optional(),
  disclosureText: z.string().min(50).max(4000).optional(),
});

const listSchema = z.object({
  as: z.enum(['sender', 'recipient', 'any']).default('any'),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'EXPIRED', 'ALL']).default('ALL'),
  crossModalityOnly: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * GET /api/referrals — list referrals involving the authenticated physician.
 *   ?as=sender|recipient|any   (default: any)
 *   ?status=PENDING|…|ALL      (default: ALL)
 *   ?crossModalityOnly=true    (default: off)
 */
export const GET = createProtectedRoute(async (request, context) => {
  try {
    const userId = context.user?.id;
    if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

    const url = new URL(request.url);
    const { as, status, crossModalityOnly, limit } = listSchema.parse(
      Object.fromEntries(url.searchParams),
    );

    const myPhysician = await prisma.physicianCatalog.findFirst({
      where: { claimedByUserId: userId },
      select: { id: true, name: true },
    });
    if (!myPhysician) {
      return NextResponse.json(
        { error: 'Authenticated user is not linked to a verified physician profile' },
        { status: 403 },
      );
    }

    const where: Record<string, unknown> = {};
    if (as === 'sender') where.fromPhysicianId = myPhysician.id;
    else if (as === 'recipient') where.toPhysicianId = myPhysician.id;
    else
      where.OR = [
        { fromPhysicianId: myPhysician.id },
        { toPhysicianId: myPhysician.id },
      ];

    if (status !== 'ALL') where.status = status;
    if (crossModalityOnly === 'true') where.isCrossModality = true;

    const referrals = await prisma.providerReferral.findMany({
      where,
      include: {
        fromPhysician: {
          select: { id: true, name: true, country: true, addressCity: true, addressState: true },
        },
        toPhysician: {
          select: { id: true, name: true, country: true, addressCity: true, addressState: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      data: referrals.map((r) => ({
        id: r.id,
        from: r.fromPhysician,
        to: r.toPhysician,
        reason: r.reason,
        fromSystemType: r.fromSystemType,
        toSystemType: r.toSystemType,
        isCrossModality: r.isCrossModality,
        initiationSource: r.initiationSource,
        status: r.status,
        acceptedAt: r.acceptedAt,
        completedAt: r.completedAt,
        declinedAt: r.declinedAt,
        declineReason: r.declineReason,
        scheduledFor: r.scheduledFor,
        outcomeSummary: r.outcomeSummary,
        createdAt: r.createdAt,
        youAre: r.fromPhysicianId === myPhysician.id ? 'sender' : 'recipient',
      })),
      total: referrals.length,
      me: { physicianId: myPhysician.id, name: myPhysician.name },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});

/**
 * POST /api/referrals — send a referral from the authenticated physician
 * to another physician in the catalog.
 *
 * Requires the sender to have a claimed physician profile (VERIFIED or PENDING).
 * Self-referral is blocked. Disclosure text is recorded verbatim.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const userId = context.user?.id;
      if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

      const body = await request.json();
      const input = createSchema.parse(body);

      const sender = await prisma.physicianCatalog.findFirst({
        where: { claimedByUserId: userId },
        include: {
          specialties: {
            where: { isPrimary: true },
            include: { specialty: { select: { systemType: true } } },
            take: 1,
          },
        },
      });
      if (!sender) {
        return NextResponse.json(
          { error: 'Only physicians with a claimed profile can send referrals' },
          { status: 403 },
        );
      }

      if (sender.id === input.toPhysicianId) {
        return NextResponse.json({ error: 'Cannot refer to yourself' }, { status: 400 });
      }

      const recipient = await prisma.physicianCatalog.findUnique({
        where: { id: input.toPhysicianId },
        include: {
          specialties: {
            where: { isPrimary: true },
            include: { specialty: { select: { systemType: true } } },
            take: 1,
          },
        },
      });
      if (!recipient || !recipient.isRegistryActive || !recipient.publicProfileEnabled) {
        return NextResponse.json({ error: 'Recipient not available for referrals' }, { status: 404 });
      }

      const fromSystemType = sender.specialties[0]?.specialty.systemType ?? 'CONVENTIONAL';
      const toSystemType = recipient.specialties[0]?.specialty.systemType ?? 'CONVENTIONAL';
      const isCrossModality = fromSystemType !== toSystemType;

      const created = await prisma.providerReferral.create({
        data: {
          fromPhysicianId: sender.id,
          toPhysicianId: recipient.id,
          patientId: input.patientId ?? null,
          reason: input.reason,
          fromSystemType,
          toSystemType,
          isCrossModality,
          initiationSource: input.initiationSource,
          disclosureText: input.disclosureText ?? DEFAULT_DISCLOSURE,
          status: 'PENDING',
        },
        select: {
          id: true,
          fromPhysicianId: true,
          toPhysicianId: true,
          fromSystemType: true,
          toSystemType: true,
          isCrossModality: true,
          status: true,
          createdAt: true,
          disclosureText: true,
        },
      });

      // Fire-and-forget stats update — if this fails we don't want to block the referral
      Promise.all([
        prisma.providerReferralStats.upsert({
          where: { physicianId: sender.id },
          create: { physicianId: sender.id, sentCount: 1 },
          update: { sentCount: { increment: 1 } },
        }),
        prisma.providerReferralStats.upsert({
          where: { physicianId: recipient.id },
          create: { physicianId: recipient.id, receivedCount: 1 },
          update: { receivedCount: { increment: 1 } },
        }),
      ]).catch(() => {});

      return NextResponse.json({
        data: created,
        message: isCrossModality
          ? 'Cross-modality referral created. Patient will be notified of the disclosure.'
          : 'Referral created successfully.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 20, windowMs: 3600_000 },
    audit: { action: 'referral_create', resource: 'ProviderReferral' },
    skipCsrf: true,
  },
);
