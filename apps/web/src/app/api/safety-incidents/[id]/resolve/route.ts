import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import {
  transitionIncident,
  InvalidTransitionError,
  ResolveGateError,
} from '@/lib/rca/incident-state-machine';
import { IncidentStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const id = context.params?.id;
      const userId = context.user?.id;

      const actionCount = await prisma.safetyCorrectiveAction.count({
        where: { incidentId: id },
      });

      if (actionCount === 0) {
        return NextResponse.json(
          { error: 'No corrective actions to verify' },
          { status: 409 },
        );
      }

      const updated = await transitionIncident(
        prisma as any,
        id,
        IncidentStatus.RESOLVED,
        userId,
      );

      return NextResponse.json({ data: updated });
    } catch (error) {
      if (error instanceof InvalidTransitionError) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 },
        );
      }
      if (error instanceof ResolveGateError) {
        return NextResponse.json(
          { error: error.message, pendingActionIds: error.pendingActionIds },
          { status: 409 },
        );
      }
      return safeErrorResponse(error, { userMessage: 'Failed to resolve incident' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'SafetyIncident.Resolve' },
  },
);
