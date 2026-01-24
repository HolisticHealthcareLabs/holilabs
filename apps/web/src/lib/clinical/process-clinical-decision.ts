/**
 * Master Clinical Decision Flow
 *
 * Implements ALL architectural laws in sequence:
 * 1. Context Merge (Law 7) - Combine real-time AI output with history
 * 2. Symptom-to-Diagnosis (Laws 1, 3, 4) - AI + deterministic fallback
 * 3. Treatment Recommendations (Laws 1, 3, 4) - Protocol-based
 * 4. Quality Evaluation (Law 6) - Async LLM-as-Judge
 *
 * The Hybrid Core: AI generates insights, deterministic code executes decisions.
 *
 * Usage:
 *   const result = await processClinicalDecision(patientId, aiScribeOutput);
 */

import { symptomDiagnosisEngine } from './engines/symptom-diagnosis-engine';
import { treatmentProtocolEngine } from './engines/treatment-protocol-engine';
import { contextMerger } from './context/context-merger';
import { scheduleEvaluation, generateInteractionId } from './quality/llm-judge';
import type { ProcessingResult } from './process-with-fallback';
import type {
  DiagnosisOutput,
  TreatmentRecommendation,
  SymptomInput,
  MergedPatientState,
} from '@holilabs/shared-types';
import logger from '@/lib/logger';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/** Real-time vital signs from AI scribe */
export interface RealTimeVitals {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  recordedAt?: string;
}

/** Output from AI Scribe */
export interface AIScribeOutput {
  chiefComplaint?: string;
  vitalSigns?: RealTimeVitals;
  symptoms?: string[];
  medicationsMentioned?: string[];
  allergiesMentioned?: string[];
  assessmentNotes?: string;
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

/** Clinical alert generated from merged data */
export interface ClinicalAlert {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  items?: string[];
}

/** Complete clinical decision result */
export interface ClinicalDecisionResult {
  interactionId: string;
  patientId: string;
  mergedState: MergedPatientState;
  diagnosis: ProcessingResult<DiagnosisOutput>;
  treatments: ProcessingResult<TreatmentRecommendation[]>[];
  alerts: ClinicalAlert[];
  processingMethods: {
    diagnosis: 'ai' | 'fallback' | 'hybrid';
    treatments: Array<'ai' | 'fallback' | 'hybrid'>;
  };
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// GOLD STANDARD CRITERIA FOR EVALUATION
// ═══════════════════════════════════════════════════════════════

const DIAGNOSIS_EVALUATION_CRITERIA = [
  'All ICD-10 codes must be valid and match diagnosis names',
  'Probabilities must sum to reasonable total (< 1.5 for top 5)',
  'Red flags must be clinically appropriate for the condition',
  'Workup suggestions must be evidence-based',
  'Urgency level must match clinical severity',
];

const TREATMENT_EVALUATION_CRITERIA = [
  'Treatment recommendations must cite evidence sources',
  'Medication dosages must be within safe ranges',
  'Contraindications must be comprehensive',
  'Evidence grades must match cited guidelines',
  'No hallucinated medications or interactions',
];

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Process a clinical decision with full Law compliance.
 *
 * This is the master orchestration function that:
 * 1. Merges real-time AI output with patient history (Law 7)
 * 2. Generates differential diagnoses with fallback (Laws 1, 3, 4)
 * 3. Gets treatment recommendations per protocol (Laws 1, 3, 4)
 * 4. Schedules async quality evaluation (Law 6)
 *
 * @param patientId Patient ID to process
 * @param aiScribeOutput Real-time output from AI scribe
 * @returns Complete clinical decision result
 */
export async function processClinicalDecision(
  patientId: string,
  aiScribeOutput: AIScribeOutput
): Promise<ClinicalDecisionResult> {
  const interactionId = `clinical_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const startTime = Date.now();

  logger.info({
    event: 'clinical_decision_start',
    interactionId,
    patientId,
    hasChiefComplaint: !!aiScribeOutput.chiefComplaint,
    symptomCount: aiScribeOutput.symptoms?.length || 0,
  });

  try {
    // ═══════════════════════════════════════════════════════════
    // Step 1: Context Merge (Law 7)
    // Combine real-time AI output with historical patient data
    // ═══════════════════════════════════════════════════════════

    const mergedState = await contextMerger.merge(patientId, aiScribeOutput);

    logger.info({
      event: 'clinical_decision_context_merged',
      interactionId,
      historicalDiagnosesCount: mergedState.historicalDiagnoses.length,
      currentMedicationsCount: mergedState.currentMedications.length,
      alertCount: mergedState.activeAlerts.length,
    });

    // ═══════════════════════════════════════════════════════════
    // Step 2: Symptom-to-Diagnosis (Laws 1, 3, 4)
    // AI generates differentials, deterministic fallback if needed
    // ═══════════════════════════════════════════════════════════

    const symptomInput: SymptomInput = {
      chiefComplaint: mergedState.chiefComplaint,
      duration: aiScribeOutput.duration,
      severity: aiScribeOutput.severity,
      associatedSymptoms: mergedState.currentSymptoms,
      aggravatingFactors: undefined,
      relievingFactors: undefined,
    };

    // Convert merged state to PatientContext for engines
    const patientContext = contextMerger.toPatientContext(mergedState);

    const diagnosisResult = await symptomDiagnosisEngine.evaluate(
      symptomInput,
      patientContext
    );

    logger.info({
      event: 'clinical_decision_diagnosis_complete',
      interactionId,
      method: diagnosisResult.method,
      confidence: diagnosisResult.confidence,
      differentialCount: diagnosisResult.data.differentials.length,
      urgency: diagnosisResult.data.urgency,
    });

    // Schedule async evaluation for diagnosis (Law 6)
    const diagnosisEvalId = generateInteractionId();
    scheduleEvaluation(
      {
        taskType: 'diagnosis-support',
        input: symptomInput,
        output: diagnosisResult.data,
        goldStandardCriteria: DIAGNOSIS_EVALUATION_CRITERIA,
      },
      diagnosisEvalId
    );

    // ═══════════════════════════════════════════════════════════
    // Step 3: Treatment Recommendations (Laws 1, 3, 4)
    // For each high-probability diagnosis, get protocol recommendations
    // ═══════════════════════════════════════════════════════════

    const highProbabilityDiagnoses = diagnosisResult.data.differentials
      .filter((d) => d.probability > 0.3)
      .slice(0, 3); // Top 3

    const treatmentResults = await Promise.all(
      highProbabilityDiagnoses.map(async (diagnosis) => {
        const result = await treatmentProtocolEngine.getRecommendations(
          diagnosis.icd10Code,
          patientContext
        );

        // Schedule async evaluation for treatment (Law 6)
        const treatmentEvalId = generateInteractionId();
        scheduleEvaluation(
          {
            taskType: 'treatment-protocol',
            input: { icd10Code: diagnosis.icd10Code, patientId },
            output: result.data,
            goldStandardCriteria: TREATMENT_EVALUATION_CRITERIA,
          },
          treatmentEvalId
        );

        return result;
      })
    );

    logger.info({
      event: 'clinical_decision_treatments_complete',
      interactionId,
      treatmentCount: treatmentResults.length,
      methods: treatmentResults.map((t) => t.method),
    });

    // ═══════════════════════════════════════════════════════════
    // Step 4: Compile Final Decision (Deterministic - Law 4)
    // ═══════════════════════════════════════════════════════════

    const decision: ClinicalDecisionResult = {
      interactionId,
      patientId,
      mergedState,
      diagnosis: diagnosisResult,
      treatments: treatmentResults,
      alerts: mergedState.activeAlerts,
      processingMethods: {
        diagnosis: diagnosisResult.method,
        treatments: treatmentResults.map((t) => t.method),
      },
      timestamp: new Date().toISOString(),
    };

    const totalLatency = Date.now() - startTime;

    logger.info({
      event: 'clinical_decision_complete',
      interactionId,
      patientId,
      totalLatencyMs: totalLatency,
      diagnosisMethod: decision.processingMethods.diagnosis,
      treatmentMethods: decision.processingMethods.treatments,
      alertCount: decision.alerts.length,
    });

    return decision;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      event: 'clinical_decision_failed',
      interactionId,
      patientId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Process diagnosis only (without treatment recommendations)
 */
export async function processDiagnosisOnly(
  patientId: string,
  symptomInput: SymptomInput
): Promise<ProcessingResult<DiagnosisOutput>> {
  const mergedState = await contextMerger.merge(patientId, {
    chiefComplaint: symptomInput.chiefComplaint,
    symptoms: symptomInput.associatedSymptoms,
  });

  const patientContext = contextMerger.toPatientContext(mergedState);
  return symptomDiagnosisEngine.evaluate(symptomInput, patientContext);
}

/**
 * Process treatment recommendations for a known diagnosis
 */
export async function processTreatmentOnly(
  patientId: string,
  icd10Code: string
): Promise<ProcessingResult<TreatmentRecommendation[]>> {
  const mergedState = await contextMerger.merge(patientId, {});

  const patientContext = contextMerger.toPatientContext(mergedState);
  return treatmentProtocolEngine.getRecommendations(icd10Code, patientContext);
}
