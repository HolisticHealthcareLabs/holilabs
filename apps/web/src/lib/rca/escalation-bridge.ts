import type { PrismaClient, SafetyEscalation as PrismaSafetyEscalation } from '@prisma/client';
import type { EventPublisher } from '@holi/event-bus';
import type { SafetyEscalationCreatedEvent } from '@holi/event-bus';

export interface OverdueAction {
  actionId: string;
  incidentId: string;
  deadline: Date;
  daysOverdue: number;
}

export type EscalationSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

function computeDaysOverdue(deadline: Date, now: Date): number {
  const diff = now.getTime() - deadline.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function severityFromDaysOverdue(days: number): EscalationSeverity {
  if (days > 14) return 'CRITICAL';
  if (days > 7) return 'HIGH';
  if (days > 3) return 'MODERATE';
  return 'LOW';
}

function truncateDescription(description: string, maxLength = 80): string {
  if (description.length <= maxLength) return description;
  return description.slice(0, maxLength - 3) + '...';
}

export async function checkOverdueActions(
  prisma: PrismaClient,
): Promise<OverdueAction[]> {
  const now = new Date();

  const actions = await prisma.safetyCorrectiveAction.findMany({
    where: {
      deadline: { lt: now },
      status: { notIn: ['COMPLETED', 'VERIFIED'] },
    },
    select: {
      id: true,
      incidentId: true,
      deadline: true,
    },
  });

  return actions.map((a) => ({
    actionId: a.id,
    incidentId: a.incidentId,
    deadline: a.deadline,
    daysOverdue: computeDaysOverdue(a.deadline, now),
  }));
}

/**
 * Creates a SafetyEscalation DB record for an overdue corrective action
 * and emits a safety.escalation.created event on the bus.
 */
export async function createEscalationForOverdueAction(
  prisma: PrismaClient,
  action: {
    id: string;
    incidentId: string;
    description: string;
    responsibleId: string;
    deadline: Date;
  },
  tenantId: string,
  eventBus?: EventPublisher,
): Promise<PrismaSafetyEscalation> {
  const now = new Date();
  const daysOverdue = computeDaysOverdue(action.deadline, now);
  const severity = severityFromDaysOverdue(daysOverdue);
  const title = `[SAFETY] Overdue corrective action: ${truncateDescription(action.description)}`;
  const description = `Corrective action ${action.id} for incident ${action.incidentId} is ${daysOverdue} day(s) overdue (deadline: ${action.deadline.toISOString()})`;

  const escalation = await prisma.safetyEscalation.create({
    data: {
      incidentId: action.incidentId,
      correctiveActionId: action.id,
      severity,
      title,
      description,
      assignedToId: action.responsibleId,
      daysOverdue,
    },
  });

  if (eventBus) {
    const event: SafetyEscalationCreatedEvent = {
      type: 'safety.escalation.created',
      payload: {
        escalationId: escalation.id,
        incidentId: action.incidentId,
        correctiveActionId: action.id,
        severity,
        daysOverdue,
        tenantId,
      },
    };
    eventBus.publish(event).catch(() => {});
  }

  return escalation;
}

export { computeDaysOverdue as _computeDaysOverdue, severityFromDaysOverdue as _severityFromDaysOverdue };
