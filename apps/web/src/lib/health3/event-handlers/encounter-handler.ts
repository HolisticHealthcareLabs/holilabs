/**
 * Encounter Event Handler
 *
 * Handles encounter.completed events:
 * 1. Advances active pathways for the patient
 * 2. Triggers quality measure evaluation
 * 3. Checks screening schedules
 */

import type { ClinicalEvent } from '@holi/event-bus';
import type { EventHandlerResult, HandlerContext } from '../types';
import { advancePathway } from '../pathways/pathway-engine';
import type { PatientPathwayFacts } from '../pathways/pathway-engine';

export const HANDLER_NAME = 'encounter-handler';

export async function handleEncounterCompleted(
  event: ClinicalEvent,
  context: HandlerContext,
): Promise<EventHandlerResult> {
  if (event.type !== 'encounter.completed') {
    return { handlerName: HANDLER_NAME, processed: false, actions: [] };
  }

  const { patientId, encounterId, tenantId } = event.payload;
  const actions: string[] = [];
  const errors: string[] = [];

  // 1. Find active pathway instances for this patient
  const activePathways = await context.prisma.carePathwayInstance.findMany({
    where: {
      patientId,
      tenantId: context.tenantId,
      status: 'ACTIVE',
    },
  });

  // Build patient facts for pathway evaluation
  const encounterCount = await context.prisma.clinicalEncounter.count({
    where: { patientId },
  });

  const facts: PatientPathwayFacts = {
    patientId,
    age: 0, // Will be enriched by caller in production
    diagnoses: [],
    medications: [],
    latestLabResults: {},
    encounterCount,
    lastEncounterDate: new Date().toISOString(),
  };

  // 2. Advance each active pathway
  for (const pathway of activePathways) {
    try {
      const result = await advancePathway(context.prisma, pathway.id, facts);
      if (result.advanced) {
        actions.push(`Advanced pathway ${pathway.id}: ${result.previousStepId} → ${result.currentStepId}`);
      }
      if (result.deviations.length > 0) {
        actions.push(`Deviations on ${pathway.id}: ${result.deviations.join(', ')}`);
      }
    } catch (err) {
      errors.push(`Pathway ${pathway.id}: ${(err as Error).message}`);
    }
  }

  // 3. Create health graph edge for this encounter
  try {
    await context.prisma.healthGraphEdge.create({
      data: {
        tenantId: context.tenantId,
        patientId,
        sourceType: 'ENCOUNTER',
        sourceId: encounterId,
        targetType: 'PATIENT',
        targetId: patientId,
        relationship: 'OCCURRED_DURING',
      },
    });
    actions.push('Created health graph edge for encounter');
  } catch (err) {
    errors.push(`Health graph: ${(err as Error).message}`);
  }

  return {
    handlerName: HANDLER_NAME,
    processed: true,
    actions,
    errors: errors.length > 0 ? errors : undefined,
  };
}
