/**
 * Escalation Service — Epic C (Follow-up Orchestration)
 *
 * Creates and resolves persistent Escalation records when the reminder
 * retry policy triggers escalation_open / escalation_closed events.
 *
 * SLA default: 4 hours from escalation creation.
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { EscalationStatus } from '@prisma/client';

const DEFAULT_SLA_HOURS = 4;

interface CreateEscalationInput {
  scheduledReminderId: string;
  patientId?: string;
  reason: string;
  channel?: string;
  attempt?: number;
  slaHours?: number;
}

interface ResolveEscalationInput {
  escalationId: string;
  resolvedBy: string;
  resolution?: string;
}

/**
 * Create a persistent escalation record when the retry policy
 * determines that an escalation should be opened.
 */
export async function createEscalation(input: CreateEscalationInput) {
  const slaHours = input.slaHours ?? DEFAULT_SLA_HOURS;
  const slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  // Avoid duplicate OPEN escalations for the same reminder
  const existing = await prisma.escalation.findFirst({
    where: {
      scheduledReminderId: input.scheduledReminderId,
      status: 'OPEN',
    },
  });

  if (existing) {
    logger.info({
      event: 'escalation_already_open',
      escalationId: existing.id,
      scheduledReminderId: input.scheduledReminderId,
    });
    return existing;
  }

  const escalation = await prisma.escalation.create({
    data: {
      scheduledReminderId: input.scheduledReminderId,
      patientId: input.patientId ?? null,
      reason: input.reason,
      channel: input.channel ?? null,
      attempt: input.attempt ?? 0,
      slaDeadline,
    },
  });

  logger.info({
    event: 'escalation_created',
    escalationId: escalation.id,
    scheduledReminderId: input.scheduledReminderId,
    patientId: input.patientId,
    slaDeadline: slaDeadline.toISOString(),
    reason: input.reason,
  });

  return escalation;
}

/**
 * Resolve an escalation (manually by a clinician).
 */
export async function resolveEscalation(input: ResolveEscalationInput) {
  const escalation = await prisma.escalation.findUnique({
    where: { id: input.escalationId },
  });

  if (!escalation) {
    throw new Error('Escalation not found');
  }

  if (escalation.status === 'RESOLVED') {
    return escalation;
  }

  const resolved = await prisma.escalation.update({
    where: { id: input.escalationId },
    data: {
      status: 'RESOLVED',
      resolvedAt: new Date(),
      resolvedBy: input.resolvedBy,
      resolution: input.resolution ?? null,
    },
  });

  logger.info({
    event: 'escalation_resolved',
    escalationId: resolved.id,
    resolvedBy: input.resolvedBy,
    previousStatus: escalation.status,
    resolution: input.resolution,
  });

  return resolved;
}

/**
 * Auto-resolve any OPEN escalation tied to a specific reminder
 * (called when escalation_closed fires after a successful retry).
 */
export async function autoResolveByReminder(scheduledReminderId: string) {
  const openEscalations = await prisma.escalation.findMany({
    where: {
      scheduledReminderId,
      status: { in: ['OPEN', 'BREACHED'] },
    },
  });

  for (const esc of openEscalations) {
    await prisma.escalation.update({
      where: { id: esc.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution: 'Auto-resolved: reminder delivered successfully on retry',
      },
    });

    logger.info({
      event: 'escalation_auto_resolved',
      escalationId: esc.id,
      scheduledReminderId,
    });
  }

  return openEscalations.length;
}

/**
 * Mark OPEN escalations past their SLA deadline as BREACHED.
 * Called by the cron worker at /api/cron/escalations.
 */
export async function breachOverdueEscalations() {
  const now = new Date();

  const overdue = await prisma.escalation.findMany({
    where: {
      status: 'OPEN',
      slaDeadline: { lt: now },
    },
    include: {
      scheduledReminder: { select: { templateName: true } },
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  let breachedCount = 0;

  for (const esc of overdue) {
    await prisma.escalation.update({
      where: { id: esc.id },
      data: { status: 'BREACHED' },
    });

    logger.error({
      event: 'escalation_sla_breached',
      escalationId: esc.id,
      scheduledReminderId: esc.scheduledReminderId,
      patientId: esc.patientId,
      patientName: esc.patient
        ? `${esc.patient.firstName} ${esc.patient.lastName}`
        : null,
      templateName: esc.scheduledReminder.templateName,
      slaDeadline: esc.slaDeadline.toISOString(),
      reason: esc.reason,
    });

    breachedCount++;
  }

  return { checked: overdue.length, breached: breachedCount };
}

/**
 * Get escalation counts grouped by status (for dashboard stats).
 */
export async function getEscalationCounts(): Promise<Record<EscalationStatus, number>> {
  const [open, breached, resolved] = await Promise.all([
    prisma.escalation.count({ where: { status: 'OPEN' } }),
    prisma.escalation.count({ where: { status: 'BREACHED' } }),
    prisma.escalation.count({ where: { status: 'RESOLVED' } }),
  ]);

  return { OPEN: open, BREACHED: breached, RESOLVED: resolved };
}
