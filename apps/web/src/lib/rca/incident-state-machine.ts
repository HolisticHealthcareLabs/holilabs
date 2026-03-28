import type {
  PrismaClient,
  SafetyIncident,
} from '@prisma/client';
import { IncidentStatus } from '@prisma/client';

export class InvalidTransitionError extends Error {
  constructor(
    public readonly current: IncidentStatus,
    public readonly next: IncidentStatus,
  ) {
    super(
      `Invalid transition from ${current} to ${next}`,
    );
    this.name = 'InvalidTransitionError';
  }
}

export class ResolveGateError extends Error {
  constructor(public readonly pendingActionIds: string[]) {
    super(
      `Cannot resolve: ${pendingActionIds.length} corrective action(s) not yet VERIFIED`,
    );
    this.name = 'ResolveGateError';
  }
}

export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.REPORTED]: [IncidentStatus.TRIAGED],
  [IncidentStatus.TRIAGED]: [IncidentStatus.UNDER_INVESTIGATION],
  [IncidentStatus.UNDER_INVESTIGATION]: [IncidentStatus.ACTIONS_PENDING],
  [IncidentStatus.ACTIONS_PENDING]: [IncidentStatus.RESOLVED],
  [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
};

export function validateTransition(
  current: IncidentStatus,
  next: IncidentStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[current];
  return allowed.includes(next);
}

export async function transitionIncident(
  prisma: PrismaClient,
  incidentId: string,
  nextStatus: IncidentStatus,
  userId: string,
  notes?: string,
): Promise<SafetyIncident> {
  return prisma.$transaction(async (tx) => {
    const incident = await tx.safetyIncident.findUniqueOrThrow({
      where: { id: incidentId },
    });

    if (!validateTransition(incident.status, nextStatus)) {
      throw new InvalidTransitionError(incident.status, nextStatus);
    }

    if (nextStatus === IncidentStatus.RESOLVED) {
      const unverifiedActions = await tx.safetyCorrectiveAction.findMany({
        where: {
          incidentId,
          status: { not: 'VERIFIED' },
        },
        select: { id: true },
      });

      if (unverifiedActions.length > 0) {
        throw new ResolveGateError(unverifiedActions.map((a) => a.id));
      }
    }

    const timestampFields: Record<string, unknown> = {};
    if (nextStatus === IncidentStatus.TRIAGED) {
      timestampFields.triagedAt = new Date();
      timestampFields.triagedById = userId;
      if (notes) {
        timestampFields.triageNotes = notes;
      }
    }

    return tx.safetyIncident.update({
      where: { id: incidentId },
      data: {
        status: nextStatus,
        ...timestampFields,
      },
    });
  });
}
