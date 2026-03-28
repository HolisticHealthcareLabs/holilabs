import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      if (!planId) {
        return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
      }

      const plan = await prisma.sharedCarePlan.findUnique({
        where: { id: planId },
        include: {
          goals: true,
          sharedRecords: { orderBy: { createdAt: 'desc' }, take: 50 },
          careTeam: {
            include: { members: { where: { isActive: true } } },
          },
        },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Shared care plan not found' }, { status: 404 });
      }

      return NextResponse.json({ data: plan });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch shared care plan' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'READ', resource: 'SharedCarePlan' },
  },
);

const UpdateSharedCarePlanSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'REVIEW_PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  interventions: z.any().optional(),
  targetOutcomes: z.any().optional(),
  reviewCycleDays: z.number().int().min(1).max(365).optional(),
  nextReviewAt: z.string().datetime().optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      if (!planId) {
        return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = UpdateSharedCarePlanSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const existing = await prisma.sharedCarePlan.findUnique({
        where: { id: planId },
        select: { id: true, status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Shared care plan not found' }, { status: 404 });
      }

      const data: any = { ...parsed.data };

      if (data.nextReviewAt) {
        data.nextReviewAt = new Date(data.nextReviewAt);
      }

      if (data.status === 'ACTIVE' || data.status === 'REVIEW_PENDING') {
        data.lastReviewedAt = new Date();
      }

      const updated = await prisma.sharedCarePlan.update({
        where: { id: planId },
        data,
        include: { goals: true },
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update shared care plan' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'SharedCarePlan' },
  },
);
