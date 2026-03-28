import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import {
  transitionIncident,
  InvalidTransitionError,
} from '@/lib/rca/incident-state-machine';
import { IncidentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const TriageSchema = z.object({
  severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional(),
  leadInvestigatorId: z.string().optional(),
  triageNotes: z.string().optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const id = context.params?.id;
      const body = await request.json();
      const parsed = TriageSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const data = parsed.data;
      const userId = context.user?.id;

      const incident = await transitionIncident(
        prisma as any,
        id,
        IncidentStatus.TRIAGED,
        userId,
        data.triageNotes,
      );

      const updateData: Record<string, unknown> = {};
      if (data.severity) updateData.severity = data.severity;
      if (data.leadInvestigatorId) updateData.leadInvestigatorId = data.leadInvestigatorId;

      let updated = incident;
      if (Object.keys(updateData).length > 0) {
        updated = await prisma.safetyIncident.update({
          where: { id },
          data: updateData,
        });
      }

      return NextResponse.json({ data: updated });
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }
      return safeErrorResponse(error, { userMessage: 'Failed to triage incident' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN'] as any,
    audit: { action: 'UPDATE', resource: 'SafetyIncident.Triage' },
  },
);
