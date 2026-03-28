import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateGoalSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  discipline: z.string().max(100).optional(),
  measureCode: z.string().optional(),
  measureName: z.string().optional(),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
  baselineValue: z.number().optional(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      if (!planId) {
        return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = CreateGoalSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const plan = await prisma.sharedCarePlan.findUnique({
        where: { id: planId },
        select: { id: true, patientId: true, careTeamId: true, status: true },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Shared care plan not found' }, { status: 404 });
      }

      if (plan.status === 'CANCELLED' || plan.status === 'COMPLETED') {
        return NextResponse.json(
          { error: `Cannot add goals to a ${plan.status} care plan` },
          { status: 409 },
        );
      }

      const goal = await prisma.careGoal.create({
        data: {
          sharedPlanId: planId,
          careTeamId: plan.careTeamId,
          patientId: plan.patientId,
          title: parsed.data.title,
          description: parsed.data.description,
          priority: parsed.data.priority as any,
          discipline: parsed.data.discipline,
          measureCode: parsed.data.measureCode,
          measureName: parsed.data.measureName,
          targetValue: parsed.data.targetValue,
          targetUnit: parsed.data.targetUnit,
          baselineValue: parsed.data.baselineValue,
          startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
          targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
          status: 'PROPOSED',
          proposedBy: context.user.id,
        },
      });

      return NextResponse.json({ data: goal }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create goal' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'CareGoal' },
  },
);
