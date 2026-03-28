import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { performRCA } from '@/lib/rca/safety-rca';
import type { SafetyEvent } from '@/lib/rca/types';
import {
  transitionIncident,
  InvalidTransitionError,
} from '@/lib/rca/incident-state-machine';
import { IncidentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const RCASchema = z.object({
  findings: z.array(z.string().min(1)).min(1),
  whyChain: z.array(z.string().min(1)).min(1),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const id = context.params?.id;
      const body = await request.json();
      const parsed = RCASchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const incident = await prisma.safetyIncident.findUnique({
        where: { id },
      });

      if (!incident) {
        return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
      }

      if (incident.status !== IncidentStatus.UNDER_INVESTIGATION) {
        return NextResponse.json(
          { error: `Incident must be in UNDER_INVESTIGATION status, currently ${incident.status}` },
          { status: 409 },
        );
      }

      const { findings, whyChain } = parsed.data;
      const userId = context.user?.id;

      const safetyEvent: SafetyEvent = {
        eventId: incident.id,
        patientId: incident.patientId ?? '',
        eventType: incident.eventType,
        severity: incident.severity,
        dateOccurred: incident.dateOccurred,
        description: incident.description,
        involvedStaff: incident.involvedStaff,
        involvedSystems: incident.involvedSystems,
        location: incident.location ?? undefined,
        reportedBy: incident.reportedById ?? 'ANONYMOUS',
      };

      const rcaResult = performRCA(safetyEvent, findings, whyChain);

      await prisma.safetyIncident.update({
        where: { id },
        data: {
          fishboneFindings: rcaResult.fishbone as any,
          fiveWhysChain: rcaResult.fiveWhys as any,
          rootCauses: rcaResult.rootCauses,
          fishboneBones: rcaResult.fishbone.findings.map((f) => f.bone),
          rcaCompletedAt: rcaResult.completedAt,
          rcaReviewedById: userId,
        },
      });

      if (rcaResult.correctiveActions.length > 0) {
        await prisma.safetyCorrectiveAction.createMany({
          data: rcaResult.correctiveActions.map((ca) => ({
            incidentId: id,
            description: ca.description,
            strength: ca.strength,
            responsibleId: userId,
            status: 'PROPOSED' as const,
            deadline: ca.deadline,
            measurableOutcome: ca.measurableOutcome,
          })),
        });
      }

      await transitionIncident(
        prisma as any,
        id,
        IncidentStatus.ACTIONS_PENDING,
        userId,
      );

      return NextResponse.json({ data: rcaResult }, { status: 201 });
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }
      return safeErrorResponse(error, { userMessage: 'Failed to perform RCA' });
    }
  },
  {
    roles: ['ADMIN', 'PHYSICIAN'] as any,
    audit: { action: 'CREATE', resource: 'SafetyIncident.RCA' },
  },
);
