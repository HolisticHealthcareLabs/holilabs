/**
 * AI Task Validator
 *
 * Task-specific validation rules for different AI use cases:
 * - Diagnosis support
 * - Clinical notes generation
 * - Prescription assistance
 * - Patient state extraction
 * - Quality grading
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { AITask, PatientState, QualityGradingResult } from '@med-app/types';

// ============================================================================
// Zod Schemas for Structured Outputs
// ============================================================================

/**
 * Schema for PatientState extraction validation
 */
export const PatientStateSchema = z.object({
  vitals: z.object({
    bp_systolic: z.number().min(50).max(300).optional(),
    bp_diastolic: z.number().min(30).max(200).optional(),
    heart_rate: z.number().min(20).max(250).optional(),
    temperature: z.number().min(90).max(110).optional(), // Fahrenheit
    weight_kg: z.number().min(1).max(500).optional(),
    height_cm: z.number().min(30).max(300).optional(),
    a1c: z.number().min(3).max(20).optional(),
    ldl: z.number().min(0).max(500).optional(),
    hdl: z.number().min(0).max(200).optional(),
    creatinine: z.number().min(0).max(30).optional(),
    respiratory_rate: z.number().min(5).max(60).optional(),
    oxygen_saturation: z.number().min(50).max(100).optional(),
  }).partial(),
  meds: z.array(z.string()),
  conditions: z.array(z.string()),
  symptoms: z.array(z.string()),
  painPoints: z.array(z.object({
    location: z.string(),
    severity: z.number().min(1).max(10),
    description: z.string(),
    duration: z.string().optional(),
    characteristics: z.array(z.string()).optional(),
  })),
  timestamp: z.string(),
  confidence: z.number().min(0).max(1),
});

/**
 * Schema for Quality Grading result validation
 */
export const QualityGradingResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dimensions: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    weight: z.number().min(0).max(1),
    issues: z.array(z.string()),
    criteria: z.array(z.string()).optional(),
  })),
  hallucinations: z.array(z.string()),
  criticalIssues: z.array(z.string()),
  recommendation: z.enum(['pass', 'review_required', 'fail']),
});

/**
 * Schema for Diagnosis Support response
 */
export const DiagnosisSupportSchema = z.object({
  differentialDiagnoses: z.array(z.object({
    condition: z.string(),
    icd10Code: z.string().optional(),
    confidence: z.number().min(0).max(1),
    supportingFindings: z.array(z.string()),
    contradictingFindings: z.array(z.string()).optional(),
  })),
  recommendedTests: z.array(z.object({
    test: z.string(),
    rationale: z.string(),
    urgency: z.enum(['routine', 'urgent', 'stat']).optional(),
  })).optional(),
  redFlags: z.array(z.string()).optional(),
  clinicalPearls: z.array(z.string()).optional(),
});

/**
 * Schema for Clinical Notes (SOAP format)
 */
export const ClinicalNotesSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  chiefComplaint: z.string().optional(),
  hpi: z.string().optional(), // History of Present Illness
  reviewOfSystems: z.record(z.string()).optional(),
});

// ============================================================================
// Task Validation Functions
// ============================================================================

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedData?: unknown;
}

/**
 * Validate PatientState extraction output
 */
export function validatePatientState(output: unknown): TaskValidationResult {
  const result = PatientStateSchema.safeParse(output);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    logger.warn({
      event: 'patient_state_validation_failed',
      errors,
    });
    return {
      valid: false,
      errors,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const data = result.data;

  // Logical consistency checks
  if (data.vitals.bp_systolic && data.vitals.bp_diastolic) {
    if (data.vitals.bp_diastolic >= data.vitals.bp_systolic) {
      warnings.push('Diastolic BP >= Systolic BP (unusual)');
    }
  }

  // Low confidence warning
  if (data.confidence < 0.7) {
    warnings.push(`Low confidence score: ${data.confidence}`);
  }

  // Empty extraction warning
  if (
    data.meds.length === 0 &&
    data.conditions.length === 0 &&
    data.symptoms.length === 0 &&
    Object.keys(data.vitals).length === 0
  ) {
    warnings.push('No clinical data extracted - verify transcript content');
  }

  return {
    valid: true,
    errors: [],
    warnings,
    parsedData: data,
  };
}

/**
 * Validate Quality Grading output
 */
export function validateQualityGrading(output: unknown): TaskValidationResult {
  const result = QualityGradingResultSchema.safeParse(output);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const data = result.data;

  // Weight sum should be 1
  const weightSum = data.dimensions.reduce((sum, d) => sum + d.weight, 0);
  if (Math.abs(weightSum - 1) > 0.01) {
    warnings.push(`Dimension weights sum to ${weightSum}, expected 1.0`);
  }

  // Consistency check: recommendation should match score
  if (data.overallScore >= 70 && data.recommendation === 'fail') {
    warnings.push('Score >= 70 but recommendation is "fail" - verify grading logic');
  }

  return {
    valid: true,
    errors: [],
    warnings,
    parsedData: data,
  };
}

/**
 * Validate Diagnosis Support output
 */
export function validateDiagnosisSupport(output: unknown): TaskValidationResult {
  const result = DiagnosisSupportSchema.safeParse(output);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const data = result.data;

  // At least one differential expected
  if (data.differentialDiagnoses.length === 0) {
    warnings.push('No differential diagnoses provided');
  }

  // Check for high confidence without supporting findings
  for (const dx of data.differentialDiagnoses) {
    if (dx.confidence > 0.8 && dx.supportingFindings.length < 2) {
      warnings.push(`High confidence (${dx.confidence}) for ${dx.condition} with few supporting findings`);
    }
  }

  // Red flags should trigger urgency
  if (data.redFlags && data.redFlags.length > 0) {
    logger.info({
      event: 'diagnosis_red_flags',
      count: data.redFlags.length,
    });
  }

  return {
    valid: true,
    errors: [],
    warnings,
    parsedData: data,
  };
}

/**
 * Validate Clinical Notes output
 */
export function validateClinicalNotes(output: unknown): TaskValidationResult {
  const result = ClinicalNotesSchema.safeParse(output);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const data = result.data;

  // Check for minimum content
  const sections = [data.subjective, data.objective, data.assessment, data.plan];
  for (let i = 0; i < sections.length; i++) {
    const sectionNames = ['Subjective', 'Objective', 'Assessment', 'Plan'];
    if (sections[i].length < 10) {
      warnings.push(`${sectionNames[i]} section appears too short`);
    }
  }

  // Plan should have actionable items
  if (!data.plan.match(/\b(order|prescribe|refer|schedule|follow.?up|monitor|continue)\b/i)) {
    warnings.push('Plan section lacks actionable items');
  }

  return {
    valid: true,
    errors: [],
    warnings,
    parsedData: data,
  };
}

// ============================================================================
// Task Router
// ============================================================================

/**
 * Validate output based on task type
 */
export function validateTaskOutput(
  task: AITask,
  output: unknown
): TaskValidationResult {
  switch (task) {
    case 'patient_state_extraction':
      return validatePatientState(output);
    case 'quality_grading':
      return validateQualityGrading(output);
    case 'diagnosis_support':
      return validateDiagnosisSupport(output);
    case 'clinical_notes':
      return validateClinicalNotes(output);
    default:
      // For tasks without specific validation, just check it's not empty
      return {
        valid: output !== null && output !== undefined,
        errors: output === null || output === undefined ? ['Output is null/undefined'] : [],
        warnings: [],
        parsedData: output,
      };
  }
}

/**
 * Parse and validate JSON string output
 */
export function parseAndValidateOutput(
  task: AITask,
  jsonString: string
): TaskValidationResult {
  try {
    // Extract JSON from response
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        valid: false,
        errors: ['No JSON object found in response'],
        warnings: [],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return validateTaskOutput(task, parsed);
  } catch (error) {
    return {
      valid: false,
      errors: [`JSON parse error: ${error instanceof Error ? error.message : 'Unknown'}`],
      warnings: [],
    };
  }
}

// ============================================================================
// Type Guards
// ============================================================================

export function isPatientState(value: unknown): value is PatientState {
  return PatientStateSchema.safeParse(value).success;
}

export function isQualityGradingResult(value: unknown): value is QualityGradingResult {
  return QualityGradingResultSchema.safeParse(value).success;
}

// ============================================================================
// Exports
// ============================================================================

export const TaskValidator = {
  validatePatientState,
  validateQualityGrading,
  validateDiagnosisSupport,
  validateClinicalNotes,
  validateTaskOutput,
  parseAndValidateOutput,
  isPatientState,
  isQualityGradingResult,
  schemas: {
    PatientStateSchema,
    QualityGradingResultSchema,
    DiagnosisSupportSchema,
    ClinicalNotesSchema,
  },
};

export default TaskValidator;
