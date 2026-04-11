import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { scoreActionStrength } from '@/lib/rca/safety-rca';

export const dynamic = 'force-dynamic';

const CreateActionSchema = z.object({
  description: z.string().min(1),
  responsibleId: z.string().min(1),
  deadline: z.string().datetime(),
  measurableOutcome: z.string().min(1),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const id = context.params?.id;
      const body = await request.json();
      const parsed = CreateActionSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const incident = await prisma.safetyIncident.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }

      const data = parsed.data;
      const strength = scoreActionStrength(data.description);

      const action = await prisma.safetyCorrectiveAction.create({
        data: {
          incidentId: id,
          description: data.description,
          strength,
          responsibleId: data.responsibleId,
          deadline: new Date(data.deadline),
          measurableOutcome: data.measurableOutcome,
        },
      });

      return NextResponse.json({ data: action }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create corrective action' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN'] as any,
    audit: { action: 'CREATE', resource: 'SafetyCorrectiveAction' },
  },
);
