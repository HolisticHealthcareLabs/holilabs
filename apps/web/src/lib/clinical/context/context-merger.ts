/**
 * Context Merger
 *
 * Law 7 Compliance: Context Merging
 * AI output must be combined with patient history BEFORE rules engine runs.
 *
 * The Check: "Does the rules engine receive PatientState that includes BOTH
 * real-time vitals AND historical diagnoses/medications?"
 *
 * This is the bridge between:
 * - Layer 1 (AI): Real-time extraction from scribe
 * - Layer 2 (Rules Engine): Historical context + real-time = full picture
 *
 * Usage:
 *   const merged = await contextMerger.merge(patientId, aiScribeOutput);
 *   const decision = await rulesEngine.evaluate(merged);
 */

import { prisma } from '@/lib/prisma';
import { DiagnosisStatus } from '@prisma/client';
import type {
  AIScribeOutput,
  PatientContext,
  MergedPatientState,
  Diagnosis,
  Medication,
  Allergy,
  LabResult,
  RiskScore,
  RealTimeVitals,
  ClinicalAlert,
} from '@holilabs/shared-types';
import logger from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Historical context loaded from database */
interface HistoricalContext {
  age: number;
  sex: 'M' | 'F' | 'O';
  diagnoses: Diagnosis[];
  medications: Medication[];
  allergies: Allergy[];
  labResults: LabResult[];
  riskScores: RiskScore[];
  lastUpdated: string;
}

/** Unverified item from AI extraction */
interface UnverifiedItem {
  source: 'AI_SCRIBE';
  needsReconciliation: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** Days to look back for recent lab results */
const LAB_LOOKBACK_DAYS = 90;

/** Vital sign thresholds for critical alerts */
const VITAL_THRESHOLDS = {
  systolicBp: { critical: 180, high: 140 },
  diastolicBp: { critical: 120, high: 90 },
  heartRate: { criticalHigh: 150, criticalLow: 40, high: 100, low: 50 },
  temperature: { criticalHigh: 40, criticalLow: 35, high: 38.5 },
  oxygenSaturation: { critical: 88, low: 92 },
  respiratoryRate: { criticalHigh: 30, criticalLow: 8, high: 24 },
};

// ═══════════════════════════════════════════════════════════════
// CONTEXT MERGER CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Context Merger
 *
 * Combines real-time AI scribe output with historical patient data
 * to create a complete picture for the rules engine.
 */
export class ContextMerger {
  private static instance: ContextMerger;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): ContextMerger {
    if (!this.instance) {
      this.instance = new ContextMerger();
    }
    return this.instance;
  }

  /**
   * Merge AI scribe output with patient historical record
   *
   * This is the REQUIRED step before rules engine execution.
   *
   * @param patientId Patient ID
   * @param aiOutput Real-time AI scribe output
   * @returns Merged patient state with both real-time and historical data
   */
  async merge(
    patientId: string,
    aiOutput: AIScribeOutput
  ): Promise<MergedPatientState> {
    logger.info({
      event: 'context_merge_start',
      patientId,
      hasVitals: !!aiOutput.vitalSigns,
      hasSymptoms: !!aiOutput.symptoms?.length,
    });

    // Load historical context from database
    const historical = await this.loadHistoricalContext(patientId);

    // Merge real-time with historical
    const merged: MergedPatientState = {
      patientId,
      age: historical.age,
      sex: historical.sex,

      // Historical data (source of truth)
      historicalDiagnoses: historical.diagnoses,
      currentMedications: this.reconcileMedications(
        historical.medications,
        aiOutput.medicationsMentioned
      ),
      knownAllergies: this.reconcileAllergies(
        historical.allergies,
        aiOutput.allergiesMentioned
      ),
      recentLabResults: historical.labResults,
      riskScores: historical.riskScores,

      // Real-time data (from AI)
      currentVitals: aiOutput.vitalSigns || (await this.getLastKnownVitals(patientId)),
      chiefComplaint: aiOutput.chiefComplaint || 'Not documented',
      currentSymptoms: aiOutput.symptoms || [],

      // Generated alerts based on merged data
      activeAlerts: [],

      // Freshness metadata
      mergedAt: new Date().toISOString(),
      dataFreshness: {
        historicalAsOf: historical.lastUpdated,
        realTimeAsOf: new Date().toISOString(),
      },
    };

    // Generate alerts from merged data
    merged.activeAlerts = this.generateMergedAlerts(merged, aiOutput);

    logger.info({
      event: 'context_merge_complete',
      patientId,
      diagnosesCount: merged.historicalDiagnoses.length,
      medicationsCount: merged.currentMedications.length,
      alertsCount: merged.activeAlerts.length,
    });

    return merged;
  }

  /**
   * Create a PatientContext from MergedPatientState
   * Used when engines need the simpler PatientContext type
   */
  toPatientContext(merged: MergedPatientState): PatientContext {
    return {
      patientId: merged.patientId,
      age: merged.age,
      sex: merged.sex,
      diagnoses: merged.historicalDiagnoses,
      medications: merged.currentMedications,
      allergies: merged.knownAllergies,
      recentLabs: merged.recentLabResults,
      riskScores: merged.riskScores,
      hasDiabetes: this.hasCondition(merged.historicalDiagnoses, ['E10', 'E11', 'E13']),
      hasHypertension: this.hasCondition(merged.historicalDiagnoses, ['I10', 'I11', 'I12', 'I13']),
      isSmoker: this.hasCondition(merged.historicalDiagnoses, ['F17', 'Z72.0']),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Load historical patient context from database
   * Uses separate queries to avoid Prisma include type issues
   */
  private async loadHistoricalContext(patientId: string): Promise<HistoricalContext> {
    // Load patient basic info
    const patient = await prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
    });

    // Load related data in parallel
    const [diagnoses, medications, allergies, labResults] = await Promise.all([
      prisma.diagnosis.findMany({
        where: {
          patientId,
          status: DiagnosisStatus.ACTIVE,
        },
        orderBy: { onsetDate: 'desc' },
      }),
      prisma.medication.findMany({
        where: {
          patientId,
          isActive: true,
        },
      }),
      prisma.allergy.findMany({
        where: { patientId },
      }),
      prisma.labResult.findMany({
        where: {
          patientId,
          resultDate: {
            gte: new Date(Date.now() - LAB_LOOKBACK_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { resultDate: 'desc' },
        take: 50,
      }),
    ]);

    // Build risk scores from patient fields
    const riskScores: RiskScore[] = [];
    if (patient.cvdRiskScore !== null) {
      riskScores.push({
        id: `${patientId}_cvd`,
        type: 'CVD_FRAMINGHAM',
        score: patient.cvdRiskScore,
        riskLevel: this.getCvdRiskLevel(patient.cvdRiskScore),
        calculatedAt: patient.updatedAt.toISOString(),
      });
    }
    if (patient.diabetesRiskScore !== null) {
      riskScores.push({
        id: `${patientId}_diabetes`,
        type: 'DIABETES_FINDRISC',
        score: patient.diabetesRiskScore,
        riskLevel: this.getDiabetesRiskLevel(patient.diabetesRiskScore),
        calculatedAt: patient.updatedAt.toISOString(),
      });
    }

    return {
      age: this.calculateAge(patient.dateOfBirth),
      sex: this.mapSex(patient.gender),
      diagnoses: diagnoses.map((d) => this.mapDiagnosis({
        id: d.id,
        icd10Code: d.icd10Code,
        description: d.description,
        onsetDate: d.onsetDate,
        status: d.status,
      })),
      medications: medications.map((m) => this.mapMedication({
        id: m.id,
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        isActive: m.isActive,
        startDate: m.startDate,
      })),
      allergies: allergies
        .filter((a) => a.verificationStatus !== 'UNVERIFIED')
        .map((a) => this.mapAllergy({
          id: a.id,
          allergen: a.allergen,
          reactions: a.reactions,
          severity: a.severity,
          verificationStatus: a.verificationStatus,
          allergyType: a.allergyType,
        })),
      labResults: labResults.map((l) => this.mapLabResult({
        id: l.id,
        testName: l.testName,
        testCode: l.testCode,
        value: l.value,
        unit: l.unit,
        referenceRange: l.referenceRange,
        interpretation: l.interpretation,
        resultDate: l.resultDate,
      })),
      riskScores,
      lastUpdated: patient.updatedAt.toISOString(),
    };
  }

  /**
   * Get last known vitals from HealthMetric
   */
  private async getLastKnownVitals(patientId: string): Promise<RealTimeVitals> {
    // Get recent health metrics for vitals
    // Note: MetricType enum doesn't include RESPIRATORY_RATE, using CUSTOM/OTHER for it
    const metrics = await prisma.healthMetric.findMany({
      where: {
        patientId,
        metricType: {
          in: ['BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'OXYGEN_SATURATION', 'WEIGHT', 'HEIGHT', 'OTHER'],
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 20, // Get enough to find latest of each type
    });

    const vitals: RealTimeVitals = {};
    const seen = new Set<string>();

    for (const metric of metrics) {
      if (seen.has(metric.metricType)) continue;
      seen.add(metric.metricType);

      const value = metric.value as Record<string, unknown>;

      switch (metric.metricType) {
        case 'BLOOD_PRESSURE':
          vitals.systolicBp = value.systolic as number | undefined;
          vitals.diastolicBp = value.diastolic as number | undefined;
          if (!vitals.recordedAt) vitals.recordedAt = metric.recordedAt.toISOString();
          break;
        case 'HEART_RATE':
          vitals.heartRate = value.value as number | undefined;
          break;
        case 'TEMPERATURE':
          vitals.temperature = value.value as number | undefined;
          break;
        case 'OXYGEN_SATURATION':
          vitals.oxygenSaturation = value.value as number | undefined;
          break;
        case 'WEIGHT':
          vitals.weight = value.value as number | undefined;
          break;
        case 'HEIGHT':
          vitals.height = value.value as number | undefined;
          break;
        case 'OTHER':
          // Handle respiratory rate stored as OTHER type
          if (value.type === 'RESPIRATORY_RATE') {
            vitals.respiratoryRate = value.value as number | undefined;
          }
          break;
      }
    }

    return vitals;
  }

  // ═══════════════════════════════════════════════════════════════
  // RECONCILIATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Reconcile AI-mentioned medications with database records
   * AI mentions are flagged but DB is source of truth
   */
  private reconcileMedications(
    dbMedications: Medication[],
    aiMentioned?: string[]
  ): Medication[] {
    if (!aiMentioned || aiMentioned.length === 0) {
      return dbMedications;
    }

    const reconciled = [...dbMedications];

    // Flag medications mentioned by AI but not in DB
    for (const mentioned of aiMentioned) {
      const normalizedMentioned = mentioned.toLowerCase().trim();
      const inDb = dbMedications.some(
        (m) =>
          m.name.toLowerCase().includes(normalizedMentioned) ||
          normalizedMentioned.includes(m.name.toLowerCase())
      );

      if (!inDb) {
        logger.info({
          event: 'context_merge_unverified_medication',
          medication: mentioned,
        });

        reconciled.push({
          id: `ai_mentioned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: mentioned,
          status: 'UNVERIFIED',
          source: 'AI_SCRIBE',
          needsReconciliation: true,
        } as Medication & UnverifiedItem);
      }
    }

    return reconciled;
  }

  /**
   * Reconcile AI-mentioned allergies with database records
   */
  private reconcileAllergies(
    dbAllergies: Allergy[],
    aiMentioned?: string[]
  ): Allergy[] {
    if (!aiMentioned || aiMentioned.length === 0) {
      return dbAllergies;
    }

    const reconciled = [...dbAllergies];

    for (const mentioned of aiMentioned) {
      const normalizedMentioned = mentioned.toLowerCase().trim();
      const inDb = dbAllergies.some(
        (a) =>
          a.allergen.toLowerCase().includes(normalizedMentioned) ||
          normalizedMentioned.includes(a.allergen.toLowerCase())
      );

      if (!inDb) {
        logger.info({
          event: 'context_merge_unverified_allergy',
          allergy: mentioned,
        });

        reconciled.push({
          id: `ai_mentioned_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          allergen: mentioned,
          status: 'UNVERIFIED',
          source: 'AI_SCRIBE',
          needsReconciliation: true,
        } as Allergy & UnverifiedItem);
      }
    }

    return reconciled;
  }

  // ═══════════════════════════════════════════════════════════════
  // ALERT GENERATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate alerts based on merged data
   */
  private generateMergedAlerts(
    state: MergedPatientState,
    aiOutput: AIScribeOutput
  ): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    // Alert: Unverified medications mentioned
    const unverifiedMeds = state.currentMedications.filter(
      (m) => (m as Medication & UnverifiedItem).needsReconciliation
    );
    if (unverifiedMeds.length > 0) {
      alerts.push({
        type: 'RECONCILIATION_NEEDED' as ClinicalAlert['type'],
        severity: 'medium',
        message: `${unverifiedMeds.length} medication(s) mentioned in encounter not in patient record`,
        items: unverifiedMeds.map((m) => m.name),
      });
    }

    // Alert: Unverified allergies mentioned
    const unverifiedAllergies = state.knownAllergies.filter(
      (a) => (a as Allergy & UnverifiedItem).needsReconciliation
    );
    if (unverifiedAllergies.length > 0) {
      alerts.push({
        type: 'RECONCILIATION_NEEDED' as ClinicalAlert['type'],
        severity: 'high', // Allergies are safety-critical
        message: `${unverifiedAllergies.length} allergy(s) mentioned in encounter not in patient record`,
        items: unverifiedAllergies.map((a) => a.allergen),
      });
    }

    // Generate vital sign alerts
    if (state.currentVitals) {
      alerts.push(...this.generateVitalAlerts(state.currentVitals));
    }

    // Alert: Low confidence AI extraction
    if (aiOutput.extractionQuality === 'uncertain') {
      alerts.push({
        type: 'CARE_GAP' as ClinicalAlert['type'], // Use closest available type
        severity: 'medium',
        message: 'AI extraction quality is uncertain - manual review recommended',
      });
    }

    return alerts;
  }

  /**
   * Generate alerts for vital sign abnormalities
   */
  private generateVitalAlerts(vitals: RealTimeVitals): ClinicalAlert[] {
    const alerts: ClinicalAlert[] = [];

    // Blood pressure
    if (vitals.systolicBp) {
      if (vitals.systolicBp >= VITAL_THRESHOLDS.systolicBp.critical) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Hypertensive crisis: SBP ${vitals.systolicBp} mmHg`,
        });
      } else if (vitals.systolicBp >= VITAL_THRESHOLDS.systolicBp.high) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'high',
          message: `Elevated blood pressure: SBP ${vitals.systolicBp} mmHg`,
        });
      }
    }

    // Heart rate
    if (vitals.heartRate) {
      if (vitals.heartRate >= VITAL_THRESHOLDS.heartRate.criticalHigh) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Severe tachycardia: HR ${vitals.heartRate} bpm`,
        });
      } else if (vitals.heartRate <= VITAL_THRESHOLDS.heartRate.criticalLow) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Severe bradycardia: HR ${vitals.heartRate} bpm`,
        });
      }
    }

    // Oxygen saturation
    if (vitals.oxygenSaturation) {
      if (vitals.oxygenSaturation <= VITAL_THRESHOLDS.oxygenSaturation.critical) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Severe hypoxia: SpO2 ${vitals.oxygenSaturation}%`,
        });
      } else if (vitals.oxygenSaturation <= VITAL_THRESHOLDS.oxygenSaturation.low) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'high',
          message: `Low oxygen saturation: SpO2 ${vitals.oxygenSaturation}%`,
        });
      }
    }

    // Temperature
    if (vitals.temperature) {
      if (vitals.temperature >= VITAL_THRESHOLDS.temperature.criticalHigh) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Hyperpyrexia: Temperature ${vitals.temperature}°C`,
        });
      } else if (vitals.temperature <= VITAL_THRESHOLDS.temperature.criticalLow) {
        alerts.push({
          type: 'VITAL_CRITICAL' as ClinicalAlert['type'],
          severity: 'critical',
          message: `Hypothermia: Temperature ${vitals.temperature}°C`,
        });
      }
    }

    return alerts;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dob: Date | null): number {
    if (!dob) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Map sex from database to type
   */
  private mapSex(gender: string | null): 'M' | 'F' | 'O' {
    switch (gender?.toUpperCase()) {
      case 'MALE':
      case 'M':
        return 'M';
      case 'FEMALE':
      case 'F':
        return 'F';
      default:
        return 'O';
    }
  }

  /**
   * Check if patient has a condition by ICD-10 prefix
   */
  private hasCondition(diagnoses: Diagnosis[], icd10Prefixes: string[]): boolean {
    return diagnoses.some((d) =>
      icd10Prefixes.some((prefix) => d.icd10Code.startsWith(prefix))
    );
  }

  /**
   * Get CVD risk level from score
   */
  private getCvdRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'very-high' {
    if (score < 10) return 'low';
    if (score < 20) return 'moderate';
    if (score < 30) return 'high';
    return 'very-high';
  }

  /**
   * Get diabetes risk level from FINDRISC score
   */
  private getDiabetesRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'very-high' {
    if (score < 7) return 'low';
    if (score < 15) return 'moderate';
    if (score < 20) return 'high';
    return 'very-high';
  }

  // ═══════════════════════════════════════════════════════════════
  // MAPPERS - Transform Prisma types to shared types
  // ═══════════════════════════════════════════════════════════════

  private mapDiagnosis(d: {
    id: string;
    icd10Code: string;
    description: string;
    onsetDate: Date | null;
    status: string;
  }): Diagnosis {
    return {
      id: d.id,
      icd10Code: d.icd10Code || 'R69',
      name: d.description,
      onsetDate: d.onsetDate?.toISOString(),
      clinicalStatus: this.mapDiagnosisStatus(d.status),
    };
  }

  private mapDiagnosisStatus(status: string): 'ACTIVE' | 'RESOLVED' | 'INACTIVE' | 'RECURRENCE' {
    switch (status) {
      case 'ACTIVE':
        return 'ACTIVE';
      case 'RECURRENCE':
        return 'RECURRENCE';
      case 'RELAPSE':
        return 'RECURRENCE'; // Map RELAPSE to RECURRENCE
      case 'RESOLVED':
        return 'RESOLVED';
      case 'INACTIVE':
        return 'INACTIVE';
      case 'REMISSION':
        return 'RESOLVED'; // Map REMISSION to RESOLVED
      default:
        return 'ACTIVE';
    }
  }

  private mapMedication(m: {
    id: string;
    name: string;
    dose: string | null;
    frequency: string | null;
    isActive: boolean;
    startDate: Date;
  }): Medication {
    return {
      id: m.id,
      name: m.name,
      dose: m.dose ?? undefined,
      frequency: m.frequency ?? undefined,
      status: m.isActive ? 'ACTIVE' : 'STOPPED',
      startDate: m.startDate.toISOString(),
    };
  }

  private mapAllergy(a: {
    id: string;
    allergen: string;
    reactions: string[];
    severity: string;
    verificationStatus: string;
    allergyType: string;
  }): Allergy {
    return {
      id: a.id,
      allergen: a.allergen,
      type: this.mapAllergyType(a.allergyType),
      reaction: a.reactions.length > 0 ? a.reactions.join(', ') : undefined,
      severity: this.mapAllergySeverity(a.severity),
      status: this.mapAllergyStatus(a.verificationStatus),
    };
  }

  private mapAllergyType(allergyType: string): 'DRUG' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER' {
    switch (allergyType.toUpperCase()) {
      case 'DRUG':
      case 'MEDICATION':
        return 'DRUG';
      case 'FOOD':
        return 'FOOD';
      case 'ENVIRONMENTAL':
        return 'ENVIRONMENTAL';
      default:
        return 'OTHER';
    }
  }

  private mapAllergySeverity(severity: string): 'mild' | 'moderate' | 'severe' | undefined {
    switch (severity.toUpperCase()) {
      case 'MILD':
        return 'mild';
      case 'MODERATE':
        return 'moderate';
      case 'SEVERE':
      case 'LIFE_THREATENING':
        return 'severe';
      default:
        return undefined;
    }
  }

  private mapAllergyStatus(verificationStatus: string): 'ACTIVE' | 'INACTIVE' | 'UNVERIFIED' {
    switch (verificationStatus) {
      case 'CLINICIAN_VERIFIED':
      case 'CONFIRMED_BY_TESTING':
      case 'CHALLENGED':
        return 'ACTIVE';
      case 'PATIENT_REPORTED':
        return 'ACTIVE'; // Still treat as active but may need verification
      case 'UNVERIFIED':
      default:
        return 'UNVERIFIED';
    }
  }

  private mapLabResult(l: {
    id: string;
    testName: string;
    testCode: string | null;
    value: string | null;
    unit: string | null;
    referenceRange: string | null;
    interpretation: string | null;
    resultDate: Date;
  }): LabResult {
    return {
      id: l.id,
      name: l.testName,
      loincCode: l.testCode ?? undefined,
      value: l.value ? parseFloat(l.value) || l.value : 0,
      unit: l.unit ?? '',
      referenceRange: l.referenceRange ?? undefined,
      interpretation: this.mapLabInterpretation(l.interpretation),
      resultDate: l.resultDate.toISOString(),
    };
  }

  private mapLabInterpretation(interpretation: string | null): 'normal' | 'abnormal' | 'critical' | undefined {
    switch (interpretation?.toUpperCase()) {
      case 'NORMAL':
      case 'N':
        return 'normal';
      case 'ABNORMAL':
      case 'A':
      case 'HIGH':
      case 'LOW':
      case 'H':
      case 'L':
        return 'abnormal';
      case 'CRITICAL':
      case 'C':
      case 'CRITICALLY_HIGH':
      case 'CRITICALLY_LOW':
        return 'critical';
      default:
        return undefined;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const contextMerger = ContextMerger.getInstance();
