/**
 * Medication Adherence Engine
 *
 * Calculates medication adherence using MAR (Medication Administration Record)
 * data - tracking actual dose-by-dose compliance rather than refill-based PDC.
 *
 * Implements all architectural laws:
 * - Law 1: Logic-as-Data - Intervention rules could be database-driven
 * - Law 2: Interface First - Uses shared types from @holilabs/shared-types
 * - Law 3: Design for Failure - Deterministic calculation with AI for interventions
 * - Law 4: Hybrid Core - Adherence calc is deterministic, AI generates interventions
 * - Law 5: Data Contract - All outputs validated via Zod schemas
 *
 * Usage:
 *   const result = await medicationAdherenceEngine.assess(patientId);
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { processWithFallback, type ProcessingResult } from '../process-with-fallback';
import { adherenceAssessmentSchema } from '@holilabs/shared-types/schemas';
import type {
  AdherenceAssessment,
  MedicationAdherence,
  AdherenceIntervention,
} from '@holilabs/shared-types';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Medication record from database */
interface MedicationRecord {
  id: string;
  name: string;
  genericName: string | null;
  dose: string;
  frequency: string;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
}

/** Administration status counts */
interface AdministrationCounts {
  total: number;
  given: number;
  missed: number;
  refused: number;
  held: number;
  late: number;
}

/** Adherence statuses that count as "taken" */
const TAKEN_STATUSES = ['GIVEN'];

/** Adherence statuses that count as "not taken" */
const NOT_TAKEN_STATUSES = ['MISSED', 'REFUSED', 'HELD'];

/** Late is partially compliant - weighted differently */
const LATE_STATUS = 'LATE';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Adherence measurement period in days */
const MEASUREMENT_PERIOD_DAYS = 30;

/** Threshold for good adherence (80% is industry standard) */
const GOOD_ADHERENCE_THRESHOLD = 80;

/** Threshold for moderate adherence */
const MODERATE_ADHERENCE_THRESHOLD = 60;

/** Weight for late doses (counts as partial compliance) */
const LATE_WEIGHT = 0.75;

// ═══════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Medication Adherence Engine
 *
 * Calculates adherence scores based on MedicationAdministration records
 * and generates interventions to improve medication-taking behavior.
 */
export class MedicationAdherenceEngine {
  private static instance: MedicationAdherenceEngine;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): MedicationAdherenceEngine {
    if (!this.instance) {
      this.instance = new MedicationAdherenceEngine();
    }
    return this.instance;
  }

  /**
   * Assess medication adherence for a patient
   *
   * @param patientId Patient ID to assess
   * @returns Processing result with adherence assessment
   */
  async assess(patientId: string): Promise<ProcessingResult<AdherenceAssessment>> {
    const requestId = `adh_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    logger.info({
      event: 'adherence_assessment_start',
      requestId,
      patientId,
    });

    // Load active medications
    const medications = await this.loadMedications(patientId);

    if (medications.length === 0) {
      logger.info({
        event: 'adherence_assessment_no_medications',
        requestId,
        patientId,
      });

      return {
        data: {
          patientId,
          overallScore: 100, // No medications = 100% adherent
          riskLevel: 'low',
          medications: [],
          interventions: [],
          processingMethod: 'fallback',
        },
        method: 'fallback',
        confidence: 'high',
      };
    }

    // Calculate adherence for each medication using MAR data
    const medicationAdherences = await this.calculateAdherence(patientId, medications);

    logger.info({
      event: 'adherence_calculated',
      requestId,
      medicationCount: medicationAdherences.length,
      averageScore: this.calculateOverallScore(medicationAdherences),
    });

    // Use AI for intervention recommendations with fallback
    const result = await processWithFallback<AdherenceAssessment>(
      this.buildPrompt(patientId, medicationAdherences),
      adherenceAssessmentSchema,
      () => this.deterministicAssessment(patientId, medicationAdherences),
      {
        task: 'general', // Lower safety requirement for adherence
        confidenceThreshold: 0.7,
        timeoutMs: 8000,
        maxRetries: 2,
      }
    );

    // Audit the decision
    await this.auditAssessment(requestId, patientId, result);

    logger.info({
      event: 'adherence_assessment_complete',
      requestId,
      patientId,
      method: result.method,
      overallScore: result.data.overallScore,
      riskLevel: result.data.riskLevel,
      interventionCount: result.data.interventions.length,
    });

    return result;
  }

  /**
   * Get adherence for a specific medication
   */
  async assessMedication(
    patientId: string,
    medicationId: string
  ): Promise<MedicationAdherence | null> {
    const medication = await prisma.medication.findFirst({
      where: {
        id: medicationId,
        patientId,
        isActive: true,
      },
    });

    if (!medication) {
      return null;
    }

    const adherences = await this.calculateAdherence(patientId, [medication]);
    return adherences[0] || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load active medications for a patient
   */
  private async loadMedications(patientId: string): Promise<MedicationRecord[]> {
    const medications = await prisma.medication.findMany({
      where: {
        patientId,
        isActive: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return medications;
  }

  // ═══════════════════════════════════════════════════════════════
  // ADHERENCE CALCULATION (DETERMINISTIC)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate adherence for each medication using MAR data
   *
   * Adherence = (Doses Taken + Late Doses × 0.75) / Total Scheduled Doses × 100
   *
   * This is a DETERMINISTIC calculation - no AI involved.
   */
  private async calculateAdherence(
    patientId: string,
    medications: MedicationRecord[]
  ): Promise<MedicationAdherence[]> {
    const results: MedicationAdherence[] = [];
    const today = new Date();
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - MEASUREMENT_PERIOD_DAYS);

    for (const med of medications) {
      // Load administration records for this medication
      const administrations = await prisma.medicationAdministration.findMany({
        where: {
          medicationId: med.id,
          patientId,
          scheduledTime: {
            gte: periodStart,
            lte: today,
          },
        },
        orderBy: { scheduledTime: 'desc' },
      });

      // Count statuses
      const counts = this.countAdministrations(administrations);

      // Calculate adherence score
      const adherenceScore = this.calculateScore(counts);

      // Find last administration and next expected
      const lastGiven = administrations.find((a) => a.status === 'GIVEN');
      const nextScheduled = await this.getNextScheduledDose(med.id, patientId);

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(counts, adherenceScore, med);

      results.push({
        medicationId: med.id,
        medicationName: med.name,
        adherenceScore,
        daysSupplyRemaining: 0, // Not applicable for MAR-based tracking
        lastRefillDate: lastGiven?.actualTime?.toISOString() || null,
        expectedRefillDate: nextScheduled?.toISOString() || null,
        missedRefills: counts.missed + counts.refused,
        riskFactors,
      });
    }

    return results;
  }

  /**
   * Count administration records by status
   */
  private countAdministrations(
    administrations: Array<{ status: string }>
  ): AdministrationCounts {
    const counts: AdministrationCounts = {
      total: administrations.length,
      given: 0,
      missed: 0,
      refused: 0,
      held: 0,
      late: 0,
    };

    for (const admin of administrations) {
      switch (admin.status) {
        case 'GIVEN':
          counts.given++;
          break;
        case 'MISSED':
          counts.missed++;
          break;
        case 'REFUSED':
          counts.refused++;
          break;
        case 'HELD':
          counts.held++;
          break;
        case 'LATE':
          counts.late++;
          break;
      }
    }

    return counts;
  }

  /**
   * Calculate adherence score from counts
   */
  private calculateScore(counts: AdministrationCounts): number {
    if (counts.total === 0) {
      return 100; // No scheduled doses = 100% adherent
    }

    // Weighted score: GIVEN = 1.0, LATE = 0.75, others = 0
    const weightedTaken = counts.given + counts.late * LATE_WEIGHT;
    const score = (weightedTaken / counts.total) * 100;

    return Math.round(Math.min(score, 100));
  }

  /**
   * Get next scheduled dose for a medication
   */
  private async getNextScheduledDose(
    medicationId: string,
    patientId: string
  ): Promise<Date | null> {
    const nextSchedule = await prisma.medicationSchedule.findFirst({
      where: {
        medicationId,
        patientId,
        isActive: true,
        scheduledTime: { gte: new Date() },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return nextSchedule?.scheduledTime || null;
  }

  /**
   * Identify risk factors based on adherence data
   */
  private identifyRiskFactors(
    counts: AdministrationCounts,
    score: number,
    med: MedicationRecord
  ): string[] {
    const riskFactors: string[] = [];

    if (score < GOOD_ADHERENCE_THRESHOLD) {
      riskFactors.push('Low adherence score');
    }

    if (counts.missed > 3) {
      riskFactors.push(`${counts.missed} missed doses in past ${MEASUREMENT_PERIOD_DAYS} days`);
    }

    if (counts.refused > 0) {
      riskFactors.push(`${counts.refused} dose(s) refused - investigate barriers`);
    }

    if (counts.held > 2) {
      riskFactors.push(`${counts.held} doses held - review clinical appropriateness`);
    }

    if (counts.late > 5) {
      riskFactors.push('Frequent late doses - timing issues');
    }

    // Complex regimen check based on frequency
    const complexFrequencies = ['TID', 'QID', 'Q4H', 'Q6H'];
    if (complexFrequencies.some((f) => med.frequency.toUpperCase().includes(f))) {
      riskFactors.push('Complex dosing schedule');
    }

    return riskFactors;
  }

  // ═══════════════════════════════════════════════════════════════
  // DETERMINISTIC FALLBACK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate deterministic assessment when AI is unavailable
   * MUST NEVER FAIL - this is the safety net
   */
  private deterministicAssessment(
    patientId: string,
    medications: MedicationAdherence[]
  ): AdherenceAssessment {
    // Calculate overall score (weighted average)
    const overallScore = this.calculateOverallScore(medications);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore, medications);

    // Generate deterministic interventions
    const interventions = this.generateDeterministicInterventions(medications, riskLevel);

    return {
      patientId,
      overallScore,
      riskLevel,
      medications,
      interventions,
      processingMethod: 'fallback',
    };
  }

  /**
   * Calculate overall adherence score
   */
  private calculateOverallScore(medications: MedicationAdherence[]): number {
    if (medications.length === 0) {
      return 100;
    }

    const sum = medications.reduce((acc, m) => acc + m.adherenceScore, 0);
    return Math.round(sum / medications.length);
  }

  /**
   * Determine risk level based on adherence metrics
   */
  private determineRiskLevel(
    overallScore: number,
    medications: MedicationAdherence[]
  ): 'low' | 'moderate' | 'high' {
    // High risk: Low overall score
    if (overallScore < MODERATE_ADHERENCE_THRESHOLD) {
      return 'high';
    }

    // High risk: Multiple missed/refused doses
    const totalMissed = medications.reduce((acc, m) => acc + m.missedRefills, 0);
    if (totalMissed >= 5) {
      return 'high';
    }

    // Moderate risk: Below good threshold
    if (overallScore < GOOD_ADHERENCE_THRESHOLD) {
      return 'moderate';
    }

    // Moderate risk: Any medication with poor adherence
    if (medications.some((m) => m.adherenceScore < MODERATE_ADHERENCE_THRESHOLD)) {
      return 'moderate';
    }

    return 'low';
  }

  /**
   * Generate deterministic interventions based on adherence data
   */
  private generateDeterministicInterventions(
    medications: MedicationAdherence[],
    riskLevel: 'low' | 'moderate' | 'high'
  ): AdherenceIntervention[] {
    const interventions: AdherenceIntervention[] = [];

    // Global interventions based on risk level
    if (riskLevel === 'high' || riskLevel === 'moderate') {
      interventions.push({
        type: 'reminder',
        priority: riskLevel === 'high' ? 'high' : 'medium',
        description: 'Set up medication reminder alarms or app notifications',
      });
    }

    // Medication-specific interventions
    for (const med of medications) {
      // Very low adherence - needs follow-up
      if (med.adherenceScore < MODERATE_ADHERENCE_THRESHOLD) {
        interventions.push({
          type: 'followup',
          priority: 'high',
          description: `Schedule follow-up to discuss barriers to taking ${med.medicationName}`,
          targetMedication: med.medicationName,
        });
      }

      // Multiple missed doses - investigate cause
      if (med.missedRefills > 3) {
        interventions.push({
          type: 'education',
          priority: 'medium',
          description: `Review importance and proper timing of ${med.medicationName}`,
          targetMedication: med.medicationName,
        });
      }

      // Refusal pattern - address barriers
      if (med.riskFactors.some((r) => r.includes('refused'))) {
        interventions.push({
          type: 'followup',
          priority: 'high',
          description: `Patient refusing ${med.medicationName} - assess for side effects or concerns`,
          targetMedication: med.medicationName,
        });
      }

      // Complex schedule - simplification
      if (med.riskFactors.some((r) => r.includes('Complex'))) {
        interventions.push({
          type: 'simplification',
          priority: 'medium',
          description: `Consider simplifying dosing schedule for ${med.medicationName} if clinically appropriate`,
          targetMedication: med.medicationName,
        });
      }

      // Timing issues
      if (med.riskFactors.some((r) => r.includes('late'))) {
        interventions.push({
          type: 'reminder',
          priority: 'medium',
          description: `Set specific time reminders for ${med.medicationName} to improve timing`,
          targetMedication: med.medicationName,
        });
      }
    }

    // Education for moderate/high risk
    if (riskLevel !== 'low' && interventions.length > 0) {
      interventions.push({
        type: 'education',
        priority: 'low',
        description:
          'Provide patient education on importance of medication adherence and condition management',
      });
    }

    // Deduplicate and sort by priority
    return this.deduplicateInterventions(interventions).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Remove duplicate interventions
   */
  private deduplicateInterventions(
    interventions: AdherenceIntervention[]
  ): AdherenceIntervention[] {
    const seen = new Set<string>();
    return interventions.filter((i) => {
      const key = `${i.type}:${i.targetMedication || 'global'}:${i.description.slice(0, 50)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AI PROMPT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build prompt for AI-generated interventions
   */
  private buildPrompt(patientId: string, medications: MedicationAdherence[]): string {
    const medsInfo = medications
      .map(
        (m) => `
- ${m.medicationName}:
  Adherence Score: ${m.adherenceScore}%
  Missed/Refused Doses: ${m.missedRefills}
  Risk Factors: ${m.riskFactors.join(', ') || 'None'}`
      )
      .join('');

    return `You are a clinical decision support system analyzing medication adherence.

PATIENT ID: ${patientId}

ADHERENCE DATA (based on actual dose administration records):
${medsInfo}

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
- patientId: "${patientId}"
- overallScore: Number 0-100 (weighted average of medication scores)
- riskLevel: "low", "moderate", or "high"
- medications: (same as input data)
- interventions: Array of interventions, each with:
  - type: "reminder", "education", "simplification", "cost", or "followup"
  - priority: "high", "medium", or "low"
  - description: Specific actionable intervention
  - targetMedication: (optional) Specific medication this targets
- processingMethod: "ai"

INTERVENTION GUIDANCE:
- For low scores: Focus on identifying barriers and scheduling follow-up
- For refused doses: Assess for side effects, patient concerns, or misunderstanding
- For missed doses: Consider reminder systems, pillbox organizers
- For complex regimens: Consider simplification if clinically appropriate
- For timing issues: Specific reminder times aligned with patient routine
- Be specific and actionable
- Prioritize evidence-based interventions`;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log assessment for audit trail
   */
  private async auditAssessment(
    requestId: string,
    patientId: string,
    result: ProcessingResult<AdherenceAssessment>
  ): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          provider: result.method === 'ai' ? 'claude' : 'fallback',
          model: result.method === 'ai' ? 'claude-3-5-sonnet' : undefined,
          feature: 'adherence-assessment',
          queryComplexity: 'complex',
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          responseTimeMs: result.aiLatencyMs ?? 0,
          fromCache: false,
          patientId, // Proper FK reference for audit trail
          // PHI-safe metadata (no patient details, just metrics)
          promptHash: `${requestId}:${result.method}:${result.data.riskLevel}:${result.data.interventions.length}`,
        },
      });

      // Log details separately (PHI-safe)
      logger.info({
        event: 'adherence_assessment_audited',
        requestId,
        // patientId logged via structured field, not in message
        method: result.method,
        overallScore: result.data.overallScore,
        riskLevel: result.data.riskLevel,
        interventionsCount: result.data.interventions.length,
      });
    } catch (error) {
      logger.error({
        event: 'adherence_assessment_audit_failed',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const medicationAdherenceEngine = MedicationAdherenceEngine.getInstance();
