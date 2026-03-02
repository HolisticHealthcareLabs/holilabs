/**
 * Condition-to-Plan Pipeline
 *
 * Processes detected clinical conditions into actionable PreventionPlans.
 * Bridges condition detection (NLP/ICD-10) with the prevention planning system,
 * using international clinical protocols to generate evidence-based plans.
 *
 * Flow: DetectedCondition[] → filter by confidence → check existing plans → create plans → emit events
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { DetectedCondition } from './condition-detection';
import { getProtocolsForCondition } from './international-protocols';
import { emitPreventionEventToRoom } from '@/lib/socket-server';

// Type assertion to work around Prisma client not having generated types for newer models
const db = prisma as any;

const CONFIDENCE_THRESHOLD = 0.80; // 80% — only high-confidence conditions create plans

/**
 * Map condition categories to PreventionPlanType enum values.
 */
function mapCategoryToPlanType(category: string): string {
  const mapping: Record<string, string> = {
    cardiovascular: 'CARDIOVASCULAR',
    metabolic: 'DIABETES',
    hematologic: 'COMPREHENSIVE',
    respiratory: 'COMPREHENSIVE',
    renal: 'HYPERTENSION',
    endocrine: 'COMPREHENSIVE',
    oncology: 'CANCER_SCREENING',
    mental_health: 'GENERAL_WELLNESS',
    musculoskeletal: 'COMPREHENSIVE',
    gastrointestinal: 'COMPREHENSIVE',
  };
  return mapping[category] || 'COMPREHENSIVE';
}

/**
 * Process detected conditions into prevention plans.
 *
 * @param patientId - Patient to create plans for
 * @param conditions - Conditions detected from clinical notes, problem lists, etc.
 * @param encounterId - Optional encounter to link plans to
 * @returns Summary of plans created/updated
 */
export async function processDetectedConditions(
  patientId: string,
  conditions: DetectedCondition[],
  encounterId?: string,
): Promise<{ plansCreated: number; plansUpdated: number }> {
  let plansCreated = 0;
  let plansUpdated = 0;

  // Filter to high-confidence conditions only
  const highConfidenceConditions = conditions.filter(
    (c) => c.confidence >= CONFIDENCE_THRESHOLD * 100,
  );

  if (highConfidenceConditions.length === 0) {
    return { plansCreated, plansUpdated };
  }

  for (const condition of highConfidenceConditions) {
    try {
      const planType = mapCategoryToPlanType(condition.category);

      // Check if an ACTIVE prevention plan of matching type already exists
      const existingPlan = await db.preventionPlan.findFirst({
        where: {
          patientId,
          planType: planType as any,
          status: 'ACTIVE',
        },
      });

      if (existingPlan) {
        plansUpdated++;
        // Link existing plan to encounter if provided
        if (encounterId) {
          await db.preventionEncounterLink.create({
            data: {
              encounterId,
              preventionPlanId: existingPlan.id,
              detectedConditions: [
                {
                  condition: condition.name,
                  code: condition.icd10Codes[0] || '',
                  displayName: condition.name,
                },
              ],
              triggeringFindings: [
                {
                  source: condition.detectedFrom,
                  confidence: condition.confidence,
                  detectedAt: condition.detectedAt.toISOString(),
                },
              ],
              confidence: condition.confidence / 100,
              sourceType: condition.detectedFrom === 'clinical_note' ? 'transcript' : 'ehr_import',
            },
          });
        }
        continue;
      }

      // Look up international protocols for this condition
      const protocols = condition.relevantProtocols
        .flatMap((protocolId) => getProtocolsForCondition(protocolId))
        .slice(0, 3); // Top 3 protocols

      // Build recommendations from protocols
      const recommendations = protocols.flatMap((protocol) =>
        protocol.interventions.slice(0, 3).map((intervention) => ({
          category: intervention.category,
          intervention: intervention.intervention,
          evidence: intervention.evidence,
          priority: protocol.priority === 'CRITICAL' ? 'critical' : 'high',
          source: protocol.source,
        })),
      );

      // Default recommendations if no protocols found
      if (recommendations.length === 0) {
        recommendations.push({
          category: 'monitoring',
          intervention: `Monitor ${condition.name} per clinical guidelines`,
          evidence: 'Clinical judgment',
          priority: 'high',
          source: 'WHO' as const,
        });
      }

      // Create prevention plan
      const plan = await db.preventionPlan.create({
        data: {
          patientId,
          planType: planType as any,
          planName: `${condition.name} Management Plan`,
          description: `Auto-generated from ${condition.detectedFrom} detection. `
            + `Condition: ${condition.name} (ICD-10: ${condition.icd10Codes.join(', ') || 'pending'}). `
            + `Confidence: ${condition.confidence}%.`,
          status: 'ACTIVE',
          goals: [
            {
              goal: `Evaluate and manage ${condition.name}`,
              targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            },
            {
              goal: 'Follow-up assessment in 3 months',
              targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            },
          ],
          recommendations,
          guidelineSource: protocols.map((p) => p.source).join(', ') || 'Clinical assessment',
          evidenceLevel: protocols[0]?.evidenceGrade || 'Consensus',
        },
      });

      plansCreated++;

      // Create encounter link if provided
      if (encounterId) {
        await db.preventionEncounterLink.create({
          data: {
            encounterId,
            preventionPlanId: plan.id,
            detectedConditions: [
              {
                condition: condition.name,
                code: condition.icd10Codes[0] || '',
                displayName: condition.name,
              },
            ],
            triggeringFindings: [
              {
                source: condition.detectedFrom,
                confidence: condition.confidence,
                detectedAt: condition.detectedAt.toISOString(),
              },
            ],
            confidence: condition.confidence / 100,
            sourceType: condition.detectedFrom === 'clinical_note' ? 'transcript' : 'ehr_import',
          },
        });
      }

      // Emit Socket.IO event (non-blocking)
      try {
        emitPreventionEventToRoom('patient:', patientId, 'prevention:plan:created', {
          patientId,
          planId: plan.id,
          planName: plan.planName,
          planType,
          source: 'condition-detection',
          condition: condition.name,
          confidence: condition.confidence,
          timestamp: new Date(),
        });
      } catch {
        // Non-blocking
      }
    } catch (error) {
      logger.error({
        event: 'condition_to_plan_error',
        condition: condition.name,
        patientId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info({
    event: 'condition_to_plan_pipeline_complete',
    conditionsProcessed: highConfidenceConditions.length,
    plansCreated,
    plansUpdated,
  });

  return { plansCreated, plansUpdated };
}
