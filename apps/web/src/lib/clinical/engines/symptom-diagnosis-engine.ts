/**
 * Symptom-to-Diagnosis Engine
 *
 * Implements all architectural laws:
 * - Law 1: Logic-as-Data - Rules loaded from SymptomDiagnosisMap table
 * - Law 2: Interface First - Uses shared types from @holilabs/shared-types
 * - Law 3: Design for Failure - processWithFallback() wraps AI call
 * - Law 4: Hybrid Core - AI generates differentials, deterministic fallback if needed
 * - Law 5: Data Contract - All outputs validated via Zod schemas
 *
 * Usage:
 *   const result = await symptomDiagnosisEngine.evaluate(symptoms, patientContext);
 */

import { prisma } from '@/lib/prisma';
import { processWithFallback, type ProcessingResult } from '../process-with-fallback';
import {
  diagnosisOutputSchema,
  type DiagnosisOutputSchema,
} from '@holilabs/shared-types/schemas';
import type {
  SymptomInput,
  DiagnosisOutput,
  DifferentialDiagnosis,
  PatientContext,
} from '@holilabs/shared-types';
import logger from '@/lib/logger';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

/** ICD-10 codes for emergent conditions */
const EMERGENT_ICD10_PREFIXES = [
  'I21', // Acute myocardial infarction
  'I60', // Nontraumatic subarachnoid hemorrhage
  'I61', // Nontraumatic intracerebral hemorrhage
  'I63', // Cerebral infarction (stroke)
  'J96', // Respiratory failure
  'R57', // Shock
  'J80', // Acute respiratory distress syndrome
  'K92.2', // GI hemorrhage
];

// ═══════════════════════════════════════════════════════════════
// ENGINE CLASS
// ═══════════════════════════════════════════════════════════════

/**
 * Symptom-to-Diagnosis Engine
 *
 * Converts patient symptoms into differential diagnoses using AI with
 * deterministic fallback when AI is unavailable or has low confidence.
 */
export class SymptomDiagnosisEngine {
  private static instance: SymptomDiagnosisEngine;

  private constructor() {
    // Singleton - use getInstance()
  }

  static getInstance(): SymptomDiagnosisEngine {
    if (!this.instance) {
      this.instance = new SymptomDiagnosisEngine();
    }
    return this.instance;
  }

  /**
   * Evaluate symptoms and generate differential diagnoses
   *
   * @param symptoms Patient symptom input
   * @param patientContext Optional patient context for probability adjustment
   * @returns Processing result with diagnosis output and metadata
   */
  async evaluate(
    symptoms: SymptomInput,
    patientContext?: PatientContext
  ): Promise<ProcessingResult<DiagnosisOutput>> {
    const requestId = `diag_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    logger.info({
      event: 'symptom_diagnosis_evaluate_start',
      requestId,
      chiefComplaint: symptoms.chiefComplaint,
      hasPatientContext: !!patientContext,
    });

    // Build AI prompt with patient context
    const prompt = this.buildPrompt(symptoms, patientContext);

    // FALLBACK IMPERATIVE: Always have deterministic backup
    const result = await processWithFallback<DiagnosisOutput>(
      prompt,
      diagnosisOutputSchema,
      () => this.deterministicFallback(symptoms, patientContext),
      {
        task: 'diagnosis-support',
        confidenceThreshold: 0.75, // Higher threshold for clinical decisions
        timeoutMs: 15000, // Allow more time for diagnosis
        maxRetries: 2,
        enableHybrid: true,
      }
    );

    // Audit log for clinical decision support
    await this.auditDecision(requestId, symptoms, result);

    logger.info({
      event: 'symptom_diagnosis_evaluate_complete',
      requestId,
      method: result.method,
      confidence: result.confidence,
      differentialCount: result.data.differentials.length,
      urgency: result.data.urgency,
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // DETERMINISTIC FALLBACK
  // ═══════════════════════════════════════════════════════════════

  /**
   * Deterministic fallback using Logic-as-Data from database
   *
   * This is regex/rule-based, not probabilistic.
   * MUST NEVER FAIL - this is the safety net when AI is unavailable.
   */
  private async deterministicFallback(
    symptoms: SymptomInput,
    patientContext?: PatientContext
  ): Promise<DiagnosisOutput> {
    logger.info({
      event: 'symptom_diagnosis_fallback_start',
      chiefComplaint: symptoms.chiefComplaint,
    });

    // Load rules from database (Logic-as-Data)
    const rules = await prisma.symptomDiagnosisMap.findMany({
      where: { isActive: true },
    });

    const matches: DifferentialDiagnosis[] = [];
    const chiefComplaintLower = symptoms.chiefComplaint.toLowerCase();
    const associatedSymptomsLower = (symptoms.associatedSymptoms || []).map((s) =>
      s.toLowerCase()
    );

    for (const rule of rules) {
      // Check if any keyword matches chief complaint or associated symptoms
      const keywordMatch = rule.symptomKeywords.some((keyword: string) => {
        const keywordLower = keyword.toLowerCase();
        return (
          chiefComplaintLower.includes(keywordLower) ||
          associatedSymptomsLower.some((s) => s.includes(keywordLower))
        );
      });

      if (keywordMatch) {
        // Calculate adjusted probability based on patient factors
        let probability = rule.baseProbability;

        if (patientContext && rule.probabilityModifiers) {
          probability = this.applyModifiers(
            probability,
            rule.probabilityModifiers as Record<string, number>,
            patientContext
          );
        }

        // Apply severity modifier
        if (symptoms.severity) {
          probability = this.applySeverityModifier(probability, symptoms.severity);
        }

        matches.push({
          icd10Code: rule.icd10Code,
          name: rule.diagnosisName,
          probability: Math.min(probability, 0.95), // Cap at 95%
          confidence: 'fallback',
          reasoning: `Keyword match: ${rule.symptomKeywords.slice(0, 3).join(', ')}`,
          redFlags: rule.redFlags,
          workupSuggestions: rule.workupSuggestions,
          source: 'rule-based',
        });
      }
    }

    // If no matches, add generic "undifferentiated" diagnosis
    if (matches.length === 0) {
      matches.push({
        icd10Code: 'R69',
        name: 'Illness, unspecified',
        probability: 0.5,
        confidence: 'fallback',
        reasoning: 'No specific diagnosis matched - requires clinical evaluation',
        redFlags: [],
        workupSuggestions: [
          'Complete history and physical examination',
          'Consider basic labs (CBC, BMP)',
        ],
        source: 'rule-based',
      });
    }

    // Sort by probability descending
    matches.sort((a, b) => b.probability - a.probability);

    const result: DiagnosisOutput = {
      differentials: matches.slice(0, 5), // Top 5
      urgency: this.determineUrgency(matches),
      processingMethod: 'fallback',
      fallbackReason: 'AI unavailable or low confidence',
      timestamp: new Date().toISOString(),
    };

    logger.info({
      event: 'symptom_diagnosis_fallback_complete',
      matchCount: matches.length,
      topDiagnosis: matches[0]?.name,
      urgency: result.urgency,
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════════
  // PROBABILITY MODIFIERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply patient-specific modifiers to base probability
   */
  private applyModifiers(
    baseProbability: number,
    modifiers: Record<string, number>,
    context: PatientContext
  ): number {
    let adjusted = baseProbability;

    // Age modifiers
    if (context.age) {
      if (modifiers['age>65'] && context.age > 65) {
        adjusted *= modifiers['age>65'];
      }
      if (modifiers['age>80'] && context.age > 80) {
        adjusted *= modifiers['age>80'];
      }
      if (modifiers['age<18'] && context.age < 18) {
        adjusted *= modifiers['age<18'];
      }
      if (modifiers['age<5'] && context.age < 5) {
        adjusted *= modifiers['age<5'];
      }
    }

    // Sex modifiers
    if (context.sex && modifiers[`sex=${context.sex}`]) {
      adjusted *= modifiers[`sex=${context.sex}`];
    }

    // Condition modifiers
    if (context.hasDiabetes && modifiers['diabetes']) {
      adjusted *= modifiers['diabetes'];
    }
    if (context.hasHypertension && modifiers['hypertension']) {
      adjusted *= modifiers['hypertension'];
    }
    if (context.isSmoker && modifiers['smoker']) {
      adjusted *= modifiers['smoker'];
    }

    // Check existing diagnoses for risk factors
    if (context.diagnoses) {
      const diagnosisCodes = context.diagnoses.map((d) => d.icd10Code);

      // Cardiovascular disease
      if (
        diagnosisCodes.some((c) => c.startsWith('I')) &&
        modifiers['cardiovascular']
      ) {
        adjusted *= modifiers['cardiovascular'];
      }

      // Renal disease
      if (diagnosisCodes.some((c) => c.startsWith('N18')) && modifiers['ckd']) {
        adjusted *= modifiers['ckd'];
      }

      // Cancer
      if (diagnosisCodes.some((c) => c.startsWith('C')) && modifiers['cancer']) {
        adjusted *= modifiers['cancer'];
      }
    }

    return adjusted;
  }

  /**
   * Apply severity modifier to probability
   */
  private applySeverityModifier(
    probability: number,
    severity: 'mild' | 'moderate' | 'severe'
  ): number {
    switch (severity) {
      case 'severe':
        return probability * 1.2;
      case 'moderate':
        return probability * 1.1;
      case 'mild':
        return probability * 0.9;
      default:
        return probability;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // URGENCY DETERMINATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine clinical urgency based on differential diagnoses
   */
  private determineUrgency(
    differentials: DifferentialDiagnosis[]
  ): 'emergent' | 'urgent' | 'routine' {
    // Check for emergent conditions
    const hasEmergentCondition = differentials.some((d) =>
      EMERGENT_ICD10_PREFIXES.some((prefix) => d.icd10Code.startsWith(prefix))
    );

    if (hasEmergentCondition) {
      return 'emergent';
    }

    // Check for red flags with significant probability
    const hasSignificantRedFlags = differentials.some(
      (d) => d.redFlags.length > 0 && d.probability > 0.3
    );

    if (hasSignificantRedFlags) {
      return 'urgent';
    }

    // Check for high-probability serious diagnoses
    const hasHighProbSerious = differentials.some(
      (d) =>
        d.probability > 0.5 &&
        (d.icd10Code.startsWith('I') || // Cardiovascular
          d.icd10Code.startsWith('J') || // Respiratory
          d.icd10Code.startsWith('K')) // GI
    );

    if (hasHighProbSerious) {
      return 'urgent';
    }

    return 'routine';
  }

  // ═══════════════════════════════════════════════════════════════
  // PROMPT BUILDING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Build AI prompt for diagnosis support
   */
  private buildPrompt(symptoms: SymptomInput, context?: PatientContext): string {
    return `You are a clinical decision support system. Generate differential diagnoses based on the patient presentation.

PATIENT SYMPTOMS:
Chief Complaint: ${symptoms.chiefComplaint}
Duration: ${symptoms.duration || 'Not specified'}
Severity: ${symptoms.severity || 'Not specified'}
Associated Symptoms: ${symptoms.associatedSymptoms?.join(', ') || 'None reported'}
Aggravating Factors: ${symptoms.aggravatingFactors?.join(', ') || 'None'}
Relieving Factors: ${symptoms.relievingFactors?.join(', ') || 'None'}

${
  context
    ? `PATIENT CONTEXT:
Age: ${context.age}
Sex: ${context.sex}
Chronic Conditions: ${context.diagnoses?.map((d) => d.name).join(', ') || 'None documented'}
Current Medications: ${context.medications?.map((m) => m.name).join(', ') || 'None'}
Allergies: ${context.allergies?.map((a) => a.allergen).join(', ') || 'None'}
${context.hasDiabetes ? 'History of Diabetes: Yes' : ''}
${context.hasHypertension ? 'History of Hypertension: Yes' : ''}
${context.isSmoker ? 'Smoking Status: Current smoker' : ''}`
    : 'No additional patient context available.'
}

REQUIRED OUTPUT FORMAT:
Return a JSON object with:
1. differentials: Array of up to 5 diagnoses, each with:
   - icd10Code: Valid ICD-10 code (e.g., "I21.0")
   - name: Diagnosis name
   - probability: Number 0-1 (your confidence this is the diagnosis)
   - confidence: "high", "medium", or "low"
   - reasoning: Brief explanation for including this diagnosis
   - redFlags: Array of warning signs that would increase urgency
   - workupSuggestions: Array of recommended tests/evaluations
   - source: "ai"
2. urgency: "emergent", "urgent", or "routine"
3. processingMethod: "ai"
4. timestamp: Current ISO timestamp

CLINICAL GUIDANCE:
- Be conservative with probabilities - clinical diagnosis is uncertain
- Include red flags that warrant immediate attention
- Suggest appropriate workup for each differential
- Consider common and serious diagnoses (don't miss dangerous conditions)
- Probabilities across all differentials need not sum to 1`;
  }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log clinical decision for audit trail
   * PHI Security: Uses hash instead of storing raw chief complaint
   */
  private async auditDecision(
    requestId: string,
    symptoms: SymptomInput,
    result: ProcessingResult<DiagnosisOutput>
  ): Promise<void> {
    try {
      // Hash the input for debugging without storing PHI
      const inputHash = this.hashInput(symptoms);

      // Use the existing AIUsageLog schema structure
      await prisma.aIUsageLog.create({
        data: {
          provider: result.method === 'ai' ? 'claude' : 'fallback',
          model: result.method === 'ai' ? 'claude-3-5-sonnet' : undefined,
          feature: 'symptom-diagnosis',
          queryComplexity: 'complex',
          promptTokens: 0, // Not tracked in this context
          completionTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          responseTimeMs: result.aiLatencyMs ?? 0,
          fromCache: false,
          // PHI-safe: Store hash for debugging, not raw chief complaint
          promptHash: `${requestId}:${inputHash}:${result.method}:${result.data.urgency}`,
        },
      });

      // Log metadata separately (PHI-safe)
      logger.info({
        event: 'symptom_diagnosis_audited',
        requestId,
        inputHash,
        method: result.method,
        urgency: result.data.urgency,
        differentialsCount: result.data.differentials?.length ?? 0,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error({
        event: 'symptom_diagnosis_audit_failed',
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a hash of the input for deduplication/caching
   */
  private hashInput(symptoms: SymptomInput): string {
    const normalized = JSON.stringify({
      cc: symptoms.chiefComplaint.toLowerCase().trim(),
      symptoms: (symptoms.associatedSymptoms || []).sort(),
      severity: symptoms.severity,
    });
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════

export const symptomDiagnosisEngine = SymptomDiagnosisEngine.getInstance();
