/**
 * Prevention Engine Service
 *
 * Real-time prevention detection engine that processes transcript findings,
 * detects conditions, generates recommendations, and emits Socket.IO events.
 *
 * Design Patterns:
 * - Singleton: Single orchestrator instance
 * - Observer: Socket.IO event emission for real-time updates
 * - Strategy: Pluggable screening protocol implementations
 * - Circuit Breaker: Graceful degradation when services fail
 *
 * Latency Budget: ≤200ms for processTranscriptFindings()
 */

import { prisma } from '@/lib/prisma';
import { PreventionPlanType } from '@prisma/client';
import logger from '@/lib/logger';
import { performance } from 'perf_hooks';
import {
  detectConditionsFromText,
  inferConditionsFromMedications,
  deduplicateConditions,
  type DetectedCondition,
} from '@/lib/prevention/condition-detection';
import { SCREENING_RULES, type ScreeningRule } from '@/lib/prevention/screening-triggers';
import {
  emitPreventionEventToUser,
  emitPreventionEventToRoom,
  emitCoPilotEvent,
} from '@/lib/socket-server';
import { SocketEvent, NotificationPriority, SocketRoom } from '@/lib/socket/events';

// ============================================================================
// TYPES
// ============================================================================

export interface TranscriptFindings {
  chiefComplaint: string;
  symptoms: string[];
  diagnoses: string[];
  entities: {
    vitals: Array<{ type: string; value: string; unit: string }>;
    procedures: string[];
    medications: string[];
    anatomy: string[];
  };
  rawTranscript: string;
}

export interface PreventionRecommendation {
  id: string;
  type: 'screening' | 'intervention' | 'lifestyle' | 'medication' | 'monitoring';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  guidelineSource: string;
  uspstfGrade?: string;
  conditionId?: string;
  actionable: boolean;
  action?: {
    type: 'order' | 'schedule' | 'educate' | 'refer';
    label: string;
    payload?: Record<string, unknown>;
  };
}

export interface ProcessingResult {
  recommendations: PreventionRecommendation[];
  detectedConditions: DetectedCondition[];
  errors: string[];
  processingTimeMs: number;
  encounterLinkId?: string;
}

// ============================================================================
// PREVENTION ENGINE SERVICE
// ============================================================================

export class PreventionEngineService {
  private conditionCache: Map<string, DetectedCondition[]> = new Map();
  private static instance: PreventionEngineService | null = null;

  constructor() {
    // Singleton pattern - use getInstance() for production
  }

  static getInstance(): PreventionEngineService {
    if (!PreventionEngineService.instance) {
      PreventionEngineService.instance = new PreventionEngineService();
    }
    return PreventionEngineService.instance;
  }

  /**
   * Main entry point: Process transcript findings and generate prevention recommendations
   *
   * Latency Budget: ≤200ms
   */
  async processTranscriptFindings(
    patientId: string,
    encounterId: string,
    findings: TranscriptFindings
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    let detectedConditions: DetectedCondition[] = [];
    let recommendations: PreventionRecommendation[] = [];
    let encounterLinkId: string | undefined;

    try {
      // Phase 1: Parallel data fetching (critical for latency)
      const [patient, existingPlans, encounter] = await Promise.all([
        this.fetchPatientWithTimeout(patientId, 100),
        this.fetchExistingPlans(patientId, 50),
        this.fetchEncounter(encounterId, 50),
      ]).catch((err) => {
        const errorMsg = err instanceof Error ? err.message : 'Unknown fetch error';
        if (errorMsg.includes('timeout') || errorMsg.includes('Database')) {
          errors.push(`Database connection timeout: ${errorMsg}`);
        } else {
          errors.push(errorMsg);
        }
        return [null, [], null] as const;
      });

      if (!patient) {
        errors.push(`Patient not found: ${patientId}`);
        return {
          recommendations: [],
          detectedConditions: [],
          errors,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Phase 2: Condition Detection (parallel execution)
      const conditionPromises = [
        this.detectConditionsFromFindings(findings),
        this.inferConditionsFromMedications(findings.entities.medications),
        this.detectConditionsFromPatientHistory(patient),
      ];

      const conditionResults = await Promise.allSettled(conditionPromises);

      for (const result of conditionResults) {
        if (result.status === 'fulfilled') {
          detectedConditions.push(...result.value);
        } else {
          logger.warn({
            event: 'condition_detection_partial_failure',
            error: result.reason,
          });
        }
      }

      // Deduplicate conditions
      detectedConditions = deduplicateConditions(detectedConditions);

      // Phase 3: Generate Recommendations (parallel)
      const recommendationPromises = [
        this.generateConditionBasedRecommendations(detectedConditions, patient),
        this.generateScreeningRecommendations(patient),
      ];

      const recResults = await Promise.allSettled(recommendationPromises);

      for (const result of recResults) {
        if (result.status === 'fulfilled') {
          recommendations.push(...result.value);
        } else {
          logger.warn({
            event: 'recommendation_generation_partial_failure',
            error: result.reason,
          });
        }
      }

      // Phase 4: Database write (encounter link)
      if (detectedConditions.length > 0 && encounter) {
        try {
          const linkPlanId = this.findMatchingPlan(existingPlans, detectedConditions);

          const encounterLink = await prisma.preventionEncounterLink.create({
            data: {
              encounterId,
              preventionPlanId: linkPlanId || await this.createDefaultPlan(patientId, detectedConditions),
              detectedConditions: detectedConditions.map((c) => ({
                condition: c.name,
                code: c.icd10Codes[0] || '',
                displayName: c.name,
              })),
              triggeringFindings: {
                chiefComplaint: findings.chiefComplaint,
                diagnoses: findings.diagnoses,
                medications: findings.entities.medications,
              },
              confidence: this.calculateAverageConfidence(detectedConditions),
              processingTimeMs: Math.round(performance.now() - startTime),
              sourceType: 'transcript',
            },
          });
          encounterLinkId = encounterLink.id;
        } catch (dbError) {
          const errorMsg = dbError instanceof Error ? dbError.message : 'Unknown DB error';
          errors.push(`Database write failed: ${errorMsg}`);
          logger.error({
            event: 'encounter_link_creation_failed',
            patientId,
            encounterId,
            error: errorMsg,
          });
        }
      }

      // Phase 5: Emit Socket.IO events (non-blocking, after DB write)
      this.emitPreventionEvents(patientId, encounterId, detectedConditions, recommendations);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      logger.error({
        event: 'prevention_engine_error',
        patientId,
        encounterId,
        error: errorMsg,
      });
    }

    const processingTimeMs = performance.now() - startTime;

    // Log performance
    logger.info({
      event: 'prevention_engine_processed',
      patientId,
      encounterId,
      processingTimeMs: Math.round(processingTimeMs),
      detectedConditionsCount: detectedConditions.length,
      recommendationsCount: recommendations.length,
      errorsCount: errors.length,
      withinBudget: processingTimeMs < 200,
    });

    return {
      recommendations,
      detectedConditions,
      errors,
      processingTimeMs,
      encounterLinkId,
    };
  }

  // ============================================================================
  // PRIVATE METHODS - Data Fetching with Timeout
  // ============================================================================

  private async fetchPatientWithTimeout(
    patientId: string,
    timeoutMs: number
  ): Promise<PatientData | null> {
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Database connection timeout')), timeoutMs)
    );

    const fetchPromise = prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        bmi: true,
        tobaccoUse: true,
        lastColonoscopy: true,
        lastMammogram: true,
        lastPapSmear: true,
        lastCholesterolTest: true,
        lastHbA1c: true,
        lastBloodPressureCheck: true,
        lastProstateScreening: true,
        lastImmunizationUpdate: true,
        medications: {
          where: { isActive: true },
          select: { id: true, name: true, isActive: true },
        },
      },
    });

    return Promise.race([fetchPromise, timeoutPromise]) as Promise<PatientData | null>;
  }

  private async fetchExistingPlans(patientId: string, timeoutMs: number): Promise<ExistingPlan[]> {
    try {
      const plans = await Promise.race([
        prisma.preventionPlan.findMany({
          where: { patientId, status: 'ACTIVE' },
          select: { id: true, planType: true, planName: true },
        }),
        new Promise<ExistingPlan[]>((resolve) =>
          setTimeout(() => resolve([]), timeoutMs)
        ),
      ]);
      return plans;
    } catch {
      return [];
    }
  }

  private async fetchEncounter(encounterId: string, timeoutMs: number): Promise<EncounterData | null> {
    try {
      return await Promise.race([
        prisma.clinicalEncounter.findUnique({
          where: { id: encounterId },
          select: { id: true, patientId: true, status: true },
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
      ]);
    } catch {
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS - Condition Detection
  // ============================================================================

  private async detectConditionsFromFindings(
    findings: TranscriptFindings
  ): Promise<DetectedCondition[]> {
    const conditions: DetectedCondition[] = [];

    // Detect from diagnoses text
    if (findings.diagnoses.length > 0) {
      const diagnosisText = findings.diagnoses.join(' ');
      const fromDiagnoses = detectConditionsFromText(diagnosisText);
      conditions.push(...fromDiagnoses);
    }

    // Detect from raw transcript
    if (findings.rawTranscript) {
      const fromTranscript = detectConditionsFromText(findings.rawTranscript);
      conditions.push(...fromTranscript);
    }

    // Detect from chief complaint
    if (findings.chiefComplaint) {
      const fromChiefComplaint = detectConditionsFromText(findings.chiefComplaint);
      conditions.push(...fromChiefComplaint);
    }

    return conditions;
  }

  private async inferConditionsFromMedications(
    medications: string[]
  ): Promise<DetectedCondition[]> {
    if (!medications || medications.length === 0) return [];

    const medList = medications.map((name) => ({ name }));
    return inferConditionsFromMedications(medList);
  }

  private async detectConditionsFromPatientHistory(
    patient: PatientData
  ): Promise<DetectedCondition[]> {
    const conditions: DetectedCondition[] = [];

    // Infer conditions from patient's active medications
    if (patient.medications && patient.medications.length > 0) {
      const medConditions = inferConditionsFromMedications(patient.medications);
      conditions.push(...medConditions);
    }

    return conditions;
  }

  // ============================================================================
  // PRIVATE METHODS - Recommendation Generation
  // ============================================================================

  private async generateConditionBasedRecommendations(
    conditions: DetectedCondition[],
    patient: PatientData
  ): Promise<PreventionRecommendation[]> {
    const recommendations: PreventionRecommendation[] = [];

    for (const condition of conditions) {
      const recs = this.getRecommendationsForCondition(condition, patient);
      recommendations.push(...recs);
    }

    return recommendations;
  }

  private getRecommendationsForCondition(
    condition: DetectedCondition,
    patient: PatientData
  ): PreventionRecommendation[] {
    const recommendations: PreventionRecommendation[] = [];
    const conditionLower = condition.name.toLowerCase();

    // Diabetes-related recommendations
    if (conditionLower.includes('diabetes')) {
      recommendations.push({
        id: `rec-${condition.id}-hba1c`,
        type: 'monitoring',
        title: 'HbA1c Monitoring',
        description: 'Monitor HbA1c every 3-6 months for diabetes management',
        priority: 'HIGH',
        guidelineSource: 'ADA 2024',
        uspstfGrade: 'A',
        conditionId: condition.id,
        actionable: true,
        action: {
          type: 'order',
          label: 'Order HbA1c',
          payload: { testType: 'HBA1C' },
        },
      });

      recommendations.push({
        id: `rec-${condition.id}-eye-exam`,
        type: 'screening',
        title: 'Diabetic Eye Examination',
        description: 'Annual dilated eye exam for diabetic retinopathy screening',
        priority: 'HIGH',
        guidelineSource: 'ADA 2024',
        uspstfGrade: 'B',
        conditionId: condition.id,
        actionable: true,
        action: {
          type: 'refer',
          label: 'Refer to Ophthalmology',
          payload: { specialty: 'OPHTHALMOLOGY' },
        },
      });
    }

    // Hypertension recommendations
    if (conditionLower.includes('hypertension')) {
      recommendations.push({
        id: `rec-${condition.id}-bp-monitoring`,
        type: 'monitoring',
        title: 'Blood Pressure Monitoring',
        description: 'Regular blood pressure monitoring for hypertension management',
        priority: 'HIGH',
        guidelineSource: 'USPSTF 2024',
        uspstfGrade: 'A',
        conditionId: condition.id,
        actionable: true,
        action: {
          type: 'educate',
          label: 'Home BP Monitoring Education',
        },
      });
    }

    // Cardiovascular disease recommendations
    if (conditionLower.includes('coronary') || conditionLower.includes('heart')) {
      recommendations.push({
        id: `rec-${condition.id}-lipid`,
        type: 'monitoring',
        title: 'Lipid Panel',
        description: 'Annual lipid panel for cardiovascular risk monitoring',
        priority: 'HIGH',
        guidelineSource: 'ACC/AHA 2024',
        conditionId: condition.id,
        actionable: true,
        action: {
          type: 'order',
          label: 'Order Lipid Panel',
          payload: { testType: 'LIPID_PANEL' },
        },
      });
    }

    // Sickle cell disease recommendations
    if (conditionLower.includes('sickle')) {
      recommendations.push({
        id: `rec-${condition.id}-hydroxyurea`,
        type: 'medication',
        title: 'Hydroxyurea Therapy Evaluation',
        description: 'Consider hydroxyurea therapy for sickle cell disease management',
        priority: 'HIGH',
        guidelineSource: 'NASCC 2025 / WHO 2025',
        conditionId: condition.id,
        actionable: true,
        action: {
          type: 'order',
          label: 'Evaluate Hydroxyurea',
        },
      });
    }

    return recommendations;
  }

  private async generateScreeningRecommendations(
    patient: PatientData
  ): Promise<PreventionRecommendation[]> {
    const recommendations: PreventionRecommendation[] = [];
    const age = this.calculateAge(patient.dateOfBirth);
    const gender = patient.gender?.toLowerCase();

    for (const rule of SCREENING_RULES) {
      // Age check
      if (age < rule.ageRange.min) continue;
      if (rule.ageRange.max && age > rule.ageRange.max) continue;

      // Gender check
      if (rule.genderRestriction && gender !== rule.genderRestriction) continue;

      // Risk factors check (simplified)
      if (rule.riskFactors?.tobaccoUse && !patient.tobaccoUse) continue;
      if (rule.riskFactors?.bmiMin && (!patient.bmi || patient.bmi < rule.riskFactors.bmiMin)) continue;

      // Check if screening is due
      const lastScreeningDate = this.getLastScreeningDate(patient, rule.screeningType);
      if (lastScreeningDate && !this.isScreeningDue(lastScreeningDate, rule.frequency)) {
        continue;
      }

      recommendations.push({
        id: `rec-screening-${rule.screeningType}-${patient.id}`,
        type: 'screening',
        title: `${rule.name} Due`,
        description: lastScreeningDate
          ? `Last performed: ${lastScreeningDate.toLocaleDateString()}. ${rule.clinicalRecommendation}`
          : `No record of previous screening. ${rule.clinicalRecommendation}`,
        priority: rule.priority,
        guidelineSource: rule.guidelineSource,
        uspstfGrade: rule.uspstfGrade,
        actionable: true,
        action: {
          type: 'order',
          label: `Order ${rule.name}`,
          payload: { screeningType: rule.screeningType },
        },
      });
    }

    return recommendations;
  }

  // ============================================================================
  // PRIVATE METHODS - Utilities
  // ============================================================================

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    return age;
  }

  private getLastScreeningDate(patient: PatientData, screeningType: string): Date | null {
    const fieldMap: Record<string, keyof PatientData> = {
      BLOOD_PRESSURE: 'lastBloodPressureCheck',
      CHOLESTEROL: 'lastCholesterolTest',
      DIABETES_SCREENING: 'lastHbA1c',
      COLONOSCOPY: 'lastColonoscopy',
      MAMMOGRAM: 'lastMammogram',
      CERVICAL_CANCER: 'lastPapSmear',
      PROSTATE_CANCER: 'lastProstateScreening',
    };

    const field = fieldMap[screeningType];
    return field ? (patient[field] as Date | null) : null;
  }

  private isScreeningDue(lastScreeningDate: Date, frequency: ScreeningRule['frequency']): boolean {
    const now = new Date();
    const monthsSince = this.monthsDifference(lastScreeningDate, now);
    const frequencyMonths = (frequency.years || 0) * 12 + (frequency.months || 0);
    return monthsSince >= frequencyMonths;
  }

  private monthsDifference(from: Date, to: Date): number {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  }

  private calculateAverageConfidence(conditions: DetectedCondition[]): number {
    if (conditions.length === 0) return 0;
    const sum = conditions.reduce((acc, c) => acc + c.confidence, 0);
    return sum / conditions.length / 100; // Normalize to 0-1
  }

  private findMatchingPlan(
    existingPlans: ExistingPlan[],
    conditions: DetectedCondition[]
  ): string | null {
    // Simple matching based on condition category
    for (const condition of conditions) {
      for (const plan of existingPlans) {
        const planTypeLower = plan.planType.toLowerCase();
        const conditionLower = condition.category.toLowerCase();

        if (
          planTypeLower.includes(conditionLower) ||
          conditionLower.includes(planTypeLower)
        ) {
          return plan.id;
        }
      }
    }
    return null;
  }

  private async createDefaultPlan(
    patientId: string,
    conditions: DetectedCondition[]
  ): Promise<string> {
    // Create a general prevention plan if no existing plan matches
    const primaryCondition = conditions[0];
    const planType = this.mapConditionToPlanType(primaryCondition);

    const plan = await prisma.preventionPlan.create({
      data: {
        patientId,
        planName: `${primaryCondition.name} Prevention Plan`,
        planType,
        description: `Auto-generated prevention plan based on detected ${primaryCondition.name}`,
        goals: [],
        recommendations: [],
        status: 'ACTIVE',
        aiGeneratedBy: 'prevention-engine',
        aiConfidence: primaryCondition.confidence / 100,
      },
    });

    return plan.id;
  }

  private mapConditionToPlanType(condition: DetectedCondition): PreventionPlanType {
    // Map condition categories to valid PreventionPlanType enum values
    const categoryMap: Record<string, PreventionPlanType> = {
      cardiovascular: PreventionPlanType.CARDIOVASCULAR,
      metabolic: PreventionPlanType.DIABETES,
      hematologic: PreventionPlanType.COMPREHENSIVE,
      respiratory: PreventionPlanType.COMPREHENSIVE,
      renal: PreventionPlanType.COMPREHENSIVE,
      endocrine: PreventionPlanType.DIABETES,
      oncology: PreventionPlanType.CANCER_SCREENING,
      mental_health: PreventionPlanType.GENERAL_WELLNESS,
      musculoskeletal: PreventionPlanType.GENERAL_WELLNESS,
      gastrointestinal: PreventionPlanType.COMPREHENSIVE,
    };

    return categoryMap[condition.category] || PreventionPlanType.GENERAL_WELLNESS;
  }

  // ============================================================================
  // PRIVATE METHODS - Socket.IO Events
  // ============================================================================

  private emitPreventionEvents(
    patientId: string,
    encounterId: string,
    conditions: DetectedCondition[],
    recommendations: PreventionRecommendation[]
  ): void {
    try {
      if (conditions.length > 0) {
        // Emit to co-pilot session
        emitCoPilotEvent(encounterId, 'prevention:condition_detected', {
          patientId,
          encounterId,
          conditions: conditions.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            confidence: c.confidence,
          })),
          recommendationsCount: recommendations.length,
          timestamp: new Date(),
        });

        // Emit to prevention hub room
        emitPreventionEventToRoom(
          SocketRoom.PLAN,
          patientId,
          SocketEvent.PLAN_UPDATED,
          {
            id: `alert-${Date.now()}`,
            event: SocketEvent.PLAN_UPDATED,
            title: 'New Conditions Detected',
            message: `${conditions.length} condition(s) detected during encounter`,
            priority: NotificationPriority.HIGH,
            data: {
              patientId,
              encounterId,
              conditions,
              recommendations,
            },
            timestamp: new Date(),
          }
        );
      }

      logger.debug({
        event: 'prevention_events_emitted',
        patientId,
        encounterId,
        conditionsCount: conditions.length,
        recommendationsCount: recommendations.length,
      });
    } catch (error) {
      // Non-blocking - log but don't fail
      logger.error({
        event: 'prevention_event_emission_failed',
        patientId,
        encounterId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// ============================================================================
// TYPES (Internal)
// ============================================================================

interface PatientData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string | null;
  bmi: number | null;
  tobaccoUse: boolean;
  lastColonoscopy: Date | null;
  lastMammogram: Date | null;
  lastPapSmear: Date | null;
  lastCholesterolTest: Date | null;
  lastHbA1c: Date | null;
  lastBloodPressureCheck: Date | null;
  lastProstateScreening: Date | null;
  lastImmunizationUpdate: Date | null;
  medications: Array<{ id: string; name: string; status: string }>;
}

interface ExistingPlan {
  id: string;
  planType: string;
  planName: string;
}

interface EncounterData {
  id: string;
  patientId: string;
  status: string;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createPreventionEngineService(): PreventionEngineService {
  return new PreventionEngineService();
}

// Export singleton for direct import
export const preventionEngine = PreventionEngineService.getInstance();
