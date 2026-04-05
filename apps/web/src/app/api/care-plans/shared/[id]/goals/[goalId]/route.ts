import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z
    .enum(['PROPOSED', 'ACCEPTED', 'IN_PROGRESS', 'ACHIEVED', 'CANCELLED', 'ON_HOLD'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  currentValue: z.number().optional(),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      const goalId = context.params?.goalId;

      if (!planId || !goalId) {
        return NextResponse.json(
          { error: 'Missing plan ID or goal ID' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const parsed = UpdateGoalSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const goal = await prisma.careGoal.findFirst({
        where: { id: goalId, sharedPlanId: planId },
      });

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }

      const data: any = { ...parsed.data };

      if (data.targetDate !== undefined) {
        data.targetDate = data.targetDate ? new Date(data.targetDate) : null;
      }

      if (data.status === 'ACCEPTED' && goal.status === 'PROPOSED') {
        data.acceptedBy = context.user.id;
      }

      if (data.status === 'ACHIEVED') {
        data.achievedDate = new Date();
        data.achievedBy = context.user.id;
      }

      const updated = await prisma.careGoal.update({
        where: { id: goalId },
        data,
      });

      return NextResponse.json({ data: updated });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to update goal' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'CareGoal' },
  },
);
