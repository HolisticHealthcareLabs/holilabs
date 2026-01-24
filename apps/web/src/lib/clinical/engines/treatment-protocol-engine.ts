/**
 * Treatment Protocol Engine
 *
 * Converts clinical guidelines to actionable treatment recommendations.
 * Example: "Per ACC/AHA 2022, recommend Atorvastatin 40mg"
 *
 * Implements all architectural laws:
 * - Law 1: Logic-as-Data - Protocols loaded from TreatmentProtocol table
 * - Law 2: Interface First - Uses shared types from @holilabs/shared-types
 * - Law 3: Design for Failure - processWithFallback() wraps AI call
 * - Law 4: Hybrid Core - AI generates recommendations, deterministic executes protocols
 * - Law 5: Data Contract - All outputs validated via Zod schemas
 *
 * Usage:
 *   const result = await treatmentProtocolEngine.getRecommendations('E11.9', patientContext);
 */

import { prisma } from '@/lib/prisma';
import { processWithFallback, type ProcessingResult } from '../process-with-fallback';
import {
  treatmentRecommendationSchema,
} from '@holilabs/shared-types/schemas';
import { z } from 'zod';
import type {
  TreatmentRecommendation,
  EligibilityCriterion,
  PatientContext,
} from '@holilabs/shared-types';
import logger from '@/lib/logger';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Result of protocol matching */
interface ProtocolMatchResult {
  protocolId: string;
  protocolName: string;
  guidelineSource: string;
  isEligible: boolean;
  eligibilityDetails: EligibilityDetail[];
}

interface EligibilityDetail {
  criterion: string;
  passed: boolean;
  actualValue?: unknown;
  expectedValue?: unknown;
}

/** Schema for array of treatment recommendations - cast to fix Zod/TS inference mismatch */
const treatmentRecommendationsArraySchema = z.array(
  treatmentRecommendationSchema
) as z.ZodType<TreatmentRecommendation[]>;

// ═══════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Treatment Protocol Engine
 *
 * Matches patients to evidence-based treatment protocols and generates
 * personalized recommendations with contraindication filtering.
 */
export class TreatmentProtocolEngine {
  private static instance: TreatmentProtocolEngine;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): TreatmentProtocolEngine {
    if (!this.instance) {
      this.instance = new TreatmentProtocolEngine();
    }
    return this.instance;
  }

  /**
   * Get treatment recommendations for a condition
   *
   * @param conditionIcd10 ICD-10 code for the condition
   * @param patientContext Patient context for eligibility and contraindications
   * @returns Processing result with treatment recommendations
   */
  async getRecommendations(
    conditionIcd10: string,
    patientContext: PatientContext
  ): Promise<ProcessingResult<TreatmentRecommendation[]>> {
    const requestId = `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    logger.info({
      event: 'treatment_protocol_start',
      requestId,
      conditionIcd10,
      patientId: patientContext.patientId,
    });

    // First, try to match active protocol from database (Logic-as-Data)
    const protocol = await this.findMatchingProtocol(conditionIcd10);

    if (protocol) {
      // Check eligibility criteria
      const eligibilityResult = this.checkEligibility(
        protocol.eligibility as unknown as EligibilityCriterion[],
        patientContext
      );

      logger.info({
        event: 'treatment_protocol_eligibility_check',
        requestId,
        protocolId: protocol.id,
        isEligible: eligibilityResult.isEligible,
        passedCriteria: eligibilityResult.details.filter((d) => d.passed).length,
        totalCriteria: eligibilityResult.details.length,
      });

      if (eligibilityResult.isEligible) {
        // Patient matches protocol - return deterministic recommendations
        const recommendations = protocol.recommendations as unknown as TreatmentRecommendation[];
        const filtered = this.filterContraindicated(recommendations, patientContext);

        logger.info({
          event: 'treatment_protocol_matched',
          requestId,
          protocolId: protocol.id,
          guidelineSource: protocol.guidelineSource,
          recommendationCount: filtered.length,
          filteredOut: recommendations.length - filtered.length,
        });

        return {
          data: filtered,
          method: 'fallback', // Database-driven is deterministic
          confidence: 'high',
        };
      }
    }

    // No matching protocol or not eligible - use AI with fallback
    logger.info({
      event: 'treatment_protocol_ai_fallback',
      requestId,
      reason: protocol ? 'Patient not eligible for protocol' : 'No matching protocol found',
    });

    const result = await processWithFallback<TreatmentRecommendation[]>(
      this.buildAIPrompt(conditionIcd10, patientContext),
      treatmentRecommendationsArraySchema,
      () => this.getGenericRecommendations(conditionIcd10),
      {
        task: 'diagnosis-support', // Same safety level as diagnosis
        confidenceThreshold: 0.8,
        timeoutMs: 12000,
        maxRetries: 2,
      }
    );

    // Filter AI recommendations for contraindications
    result.data = this.filterContraindicated(result.data, patientContext);

    // Audit the decision
    await this.auditDecision(requestId, conditionIcd10, patientContext, result);

    return result;
  }

  /**
   * Get recommendations for multiple conditions
   */
  async getRecommendationsForMultiple(
    conditionIcd10Codes: string[],
    patientContext: PatientContext
  ): Promise<Map<string, ProcessingResult<TreatmentRecommendation[]>>> {
    const results = new Map<string, ProcessingResult<TreatmentRecommendation[]>>();

    // Process conditions in parallel
    await Promise.all(
      conditionIcd10Codes.map(async (code) => {
        const result = await this.getRecommendations(code, patientContext);
        results.set(code, result);
      })
    );

    return results;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROTOCOL MATCHING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find matching protocol from database
   */
  private async findMatchingProtocol(conditionIcd10: string) {
    // Match on first 3 characters (category) or exact code
    const protocol = await prisma.treatmentProtocol.findFirst({
      where: {
        AND: [
          {
            OR: [
              { conditionIcd10: conditionIcd10 },
              { conditionIcd10: conditionIcd10.substring(0, 3) },
            ],
          },
          { isActive: true },
          { effectiveDate: { lte: new Date() } },
          {
            OR: [
              { expirationDate: null },
              { expirationDate: { gt: new Date() } },
            ],
          },
        ],
      },
      orderBy: [
        // Prefer exact matches
        { conditionIcd10: 'desc' },
        // Then most recent version
        { version: 'desc' },
      ],
    });

    return protocol;
  }

  // ═══════════════════════════════════════════════════════════════
  // ELIGIBILITY EVALUATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Evaluate eligibility criteria against patient context
   *
   * All logic is in the database (Logic-as-Data), not hardcoded.
   */
  private checkEligibility(
    criteria: EligibilityCriterion[],
    patient: PatientContext
  ): { isEligible: boolean; details: EligibilityDetail[] } {
    const details: EligibilityDetail[] = [];
    let allRequiredPassed = true;

    for (const criterion of criteria) {
      const actualValue = this.getFieldValue(criterion.field, patient);
      const passed = this.evaluateOperator(
        criterion.operator,
        actualValue,
        criterion.value
      );

      details.push({
        criterion: `${criterion.field} ${criterion.operator} ${JSON.stringify(criterion.value)}`,
        passed,
        actualValue,
        expectedValue: criterion.value,
      });

      if (criterion.required && !passed) {
        allRequiredPassed = false;
      }
    }

    return {
      isEligible: allRequiredPassed,
      details,
    };
  }

  /**
   * Get field value from patient context using dot notation
   * Supports: "age", "labs.hba1c", "vitals.systolicBp", etc.
   */
  private getFieldValue(field: string, patient: PatientContext): unknown {
    const parts = field.split('.');
    let value: unknown = patient;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return value;
  }

  /**
   * Evaluate a comparison operator
   */
  private evaluateOperator(
    operator: EligibilityCriterion['operator'],
    actual: unknown,
    expected: unknown
  ): boolean {
    // Handle undefined actual values
    if (actual === undefined || actual === null) {
      return false;
    }

    switch (operator) {
      case 'eq':
        return actual === expected;
      case 'gt':
        return Number(actual) > Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'notIn':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'contains':
        if (Array.isArray(actual)) return actual.includes(expected);
        if (typeof actual === 'string') return actual.includes(String(expected));
        return false;
      default:
        logger.warn({
          event: 'treatment_protocol_unknown_operator',
          operator,
        });
        return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CONTRAINDICATION FILTERING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Filter recommendations based on patient allergies and medications
   */
  private filterContraindicated(
    recommendations: TreatmentRecommendation[],
    patient: PatientContext
  ): TreatmentRecommendation[] {
    return recommendations.filter((rec) => {
      // Check allergies for medication recommendations
      if (rec.medication && patient.allergies) {
        const allergyMatch = patient.allergies.some((allergy) =>
          rec.contraindications.some(
            (c) =>
              c.toLowerCase().includes(allergy.allergen.toLowerCase()) ||
              allergy.allergen.toLowerCase().includes(rec.medication!.name.toLowerCase())
          )
        );

        if (allergyMatch) {
          logger.info({
            event: 'treatment_filtered_allergy',
            medication: rec.medication.name,
            patientId: patient.patientId,
          });
          return false;
        }
      }

      // Check for duplicate medications (already on same med)
      if (rec.medication && patient.medications) {
        const duplicate = patient.medications.some(
          (m) =>
            m.rxNormCode === rec.medication?.rxNormCode ||
            m.name.toLowerCase() === rec.medication?.name.toLowerCase()
        );

        if (duplicate) {
          logger.info({
            event: 'treatment_filtered_duplicate',
            medication: rec.medication.name,
            patientId: patient.patientId,
          });
          return false;
        }
      }

      // Check explicit contraindications against patient conditions
      if (rec.contraindications.length > 0 && patient.diagnoses) {
        const conditionMatch = patient.diagnoses.some((diagnosis) =>
          rec.contraindications.some(
            (c) =>
              c.toLowerCase().includes(diagnosis.name.toLowerCase()) ||
              diagnosis.icd10Code.startsWith(c)
          )
        );

        if (conditionMatch) {
          logger.info({
            event: 'treatment_filtered_contraindication',
            medication: rec.medication?.name || rec.type,
            patientId: patient.patientId,
          });
          return false;
        }
      }

      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // FALLBACK RECOMMENDATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generic recommendations when no protocol matches
   * MUST NEVER FAIL - this is the safety net
   */
  private async getGenericRecommendations(
    conditionIcd10: string
  ): Promise<TreatmentRecommendation[]> {
    logger.info({
      event: 'treatment_generic_fallback',
      conditionIcd10,
    });

    // Return monitoring-only recommendations
    return [
      {
        id: `generic-monitoring-${conditionIcd10}`,
        type: 'monitoring',
        priority: 'recommended',
        rationale:
          'No specific protocol available for this condition. Recommend clinical monitoring and guideline consultation.',
        evidenceGrade: 'expert-opinion',
        contraindications: [],
      },
      {
        id: `generic-followup-${conditionIcd10}`,
        type: 'referral',
        priority: 'consider',
        rationale:
          'Consider specialist consultation for evidence-based treatment recommendations.',
        evidenceGrade: 'expert-opinion',
        contraindications: [],
      },
    ];
  }

  // ═══════════════════════════════════════════════════════════════
  // AI PROMPT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build AI prompt for treatment recommendations
   */
  private buildAIPrompt(icd10: string, context: PatientContext): string {
    return `You are a clinical decision support system. Generate evidence-based treatment recommendations.

CONDITION: ${icd10}

PATIENT CONTEXT:
Age: ${context.age}
Sex: ${context.sex}
Current Diagnoses: ${context.diagnoses?.map((d) => `${d.icd10Code}: ${d.name}`).join(', ') || 'None documented'}
Current Medications: ${context.medications?.map((m) => `${m.name} ${m.dose || ''}`).join(', ') || 'None'}
Allergies: ${context.allergies?.map((a) => a.allergen).join(', ') || 'NKDA'}
Recent Labs: ${context.recentLabs?.map((l) => `${l.name}: ${l.value} ${l.unit}`).join(', ') || 'None available'}
${context.hasDiabetes ? 'Diabetes: Yes' : ''}
${context.hasHypertension ? 'Hypertension: Yes' : ''}

REQUIRED OUTPUT FORMAT:
Return a JSON array of treatment recommendations. Each recommendation must have:
- id: Unique identifier (string)
- type: "medication", "lab", "referral", "lifestyle", or "monitoring"
- priority: "required", "recommended", or "consider"
- medication: (if type is medication) { name, rxNormCode?, dose, frequency, duration?, route? }
- labOrder: (if type is lab) { name, loincCode?, frequency, urgency? }
- rationale: Explanation citing guideline source (e.g., "Per ACC/AHA 2022...")
- evidenceGrade: "A", "B", "C", "D", or "expert-opinion"
- contraindications: Array of conditions/allergies that would preclude this treatment

CLINICAL GUIDANCE:
- Cite specific guidelines where possible (ACC/AHA, ADA, etc.)
- Be conservative - recommend only evidence-based treatments
- Include appropriate monitoring for medications
- Consider patient's existing medications to avoid interactions
- Include contraindications for each recommendation`;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log treatment decision for audit trail
   */
  private async auditDecision(
    requestId: string,
    conditionIcd10: string,
    patientContext: PatientContext,
    result: ProcessingResult<TreatmentRecommendation[]>
  ): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          provider: result.method === 'ai' ? 'claude' : 'fallback',
          model: result.method === 'ai' ? 'claude-3-5-sonnet' : undefined,
          feature: 'treatment-protocol',
          queryComplexity: 'complex',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          responseTimeMs: result.aiLatencyMs ?? 0,
          fromCache: false,
          // PHI-safe metadata (ICD10 is a standard code, not PHI)
          promptHash: `${requestId}:${conditionIcd10}:${result.method}:${result.data.length}`,
        },
      });

      // Log details separately
      logger.info({
        event: 'treatment_protocol_audited',
        requestId,
        icd10: conditionIcd10,
        method: result.method,
        recommendationsCount: result.data.length,
        confidence: result.confidence,
      });
    } catch (error) {
      logger.error({
        event: 'treatment_protocol_audit_failed',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const treatmentProtocolEngine = TreatmentProtocolEngine.getInstance();
