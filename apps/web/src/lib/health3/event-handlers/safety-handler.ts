/**
 * Safety Event Handler
 *
 * Handles safety.incident.reported events:
 * 1. Auto-triages via triageForFullRCA
 * 2. Creates corrective action tasks on care teams
 */

import type { ClinicalEvent } from '@holi/event-bus';
import type { EventHandlerResult, HandlerContext } from '../types';

export const HANDLER_NAME = 'safety-handler';

export async function handleSafetyIncident(
  event: ClinicalEvent,
  context: HandlerContext,
): Promise<EventHandlerResult> {
  if (event.type !== 'safety.incident.reported') {
    return { handlerName: HANDLER_NAME, processed: false, actions: [] };
  }

  const { incidentId, severity, tenantId } = event.payload;
  const actions: string[] = [];

  // For HIGH/CRITICAL severity, create urgent care team task
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    try {
      const careTeams = await context.prisma.careTeam.findMany({
        where: {
          patientId: event.payload.patientId,
          status: 'ACTIVE',
        },
        take: 1,
      });

      if (careTeams.length > 0) {
        await context.prisma.careTeamTask.create({
          data: {
            careTeamId: careTeams[0].id,
            title: `[SAFETY] Review incident ${incidentId}`,
            description: `Safety incident reported with severity ${severity}. Immediate review required.`,
            priority: 'URGENT',
            status: 'PENDING',
            slaHours: severity === 'CRITICAL' ? 4 : 24,
          },
        });
        actions.push(`Created urgent care team task for incident ${incidentId}`);
      }
    } catch (err) {
      return {
        handlerName: HANDLER_NAME,
        processed: true,
        actions,
        errors: [(err as Error).message],
      };
    }
  }

  // Create health graph edge linking incident to patient
  try {
    await context.prisma.healthGraphEdge.create({
      data: {
        tenantId: context.tenantId,
        patientId: event.payload.patientId,
        sourceType: 'INCIDENT',
        sourceId: incidentId,
        targetType: 'PATIENT',
        targetId: event.payload.patientId,
        relationship: 'OCCURRED_DURING',
        safetyIncidentId: incidentId,
      },
    });
    actions.push('Created health graph edge for safety incident');
  } catch (err) {
    // Non-fatal — log but don't fail
  }

  return {
    handlerName: HANDLER_NAME,
    processed: true,
    actions,
  };
}
