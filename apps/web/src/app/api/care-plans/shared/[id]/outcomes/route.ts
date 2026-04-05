import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RecordOutcomeSchema = z.object({
  goalId: z.string().optional(),
  outcomeType: z.enum([
    'CLINICAL_MEASURE',
    'PATIENT_REPORTED',
    'PROCESS_MEASURE',
    'COST_MEASURE',
    'READMISSION_CHECK',
    'ADVERSE_EVENT_CHECK',
  ]),
  measureCode: z.string().optional(),
  measureName: z.string().min(1).max(300),
  value: z.number().optional(),
  unit: z.string().optional(),
  valueText: z.string().optional(),
  valueJson: z.any().optional(),
  encounterId: z.string().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const planId = context.params?.id;
      if (!planId) {
        return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = RecordOutcomeSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const plan = await prisma.sharedCarePlan.findUnique({
        where: { id: planId },
        select: { id: true, patientId: true, status: true },
      });

      if (!plan) {
        return NextResponse.json({ error: 'Shared care plan not found' }, { status: 404 });
      }

      if (plan.status === 'CANCELLED') {
        return NextResponse.json(
          { error: 'Cannot record outcomes on a cancelled plan' },
          { status: 409 },
        );
      }

      if (parsed.data.goalId) {
        const goal = await prisma.careGoal.findFirst({
          where: { id: parsed.data.goalId, sharedPlanId: planId },
        });
        if (!goal) {
          return NextResponse.json(
            { error: 'Goal not found in this care plan' },
            { status: 404 },
          );
        }
      }

      const outcome = await prisma.vBCOutcomeRecord.create({
        data: {
          goalId: parsed.data.goalId,
          patientId: plan.patientId,
          outcomeType: parsed.data.outcomeType as any,
          measureCode: parsed.data.measureCode,
          measureName: parsed.data.measureName,
          value: parsed.data.value,
          unit: parsed.data.unit,
          valueText: parsed.data.valueText,
          valueJson: parsed.data.valueJson ?? undefined,
          encounterId: parsed.data.encounterId,
          providerId: context.user.id,
          organizationId: context.user.organizationId,
          recordedBy: context.user.id,
        },
      });

      return NextResponse.json({ data: outcome }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to record outcome' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'VBCOutcomeRecord' },
  },
);
