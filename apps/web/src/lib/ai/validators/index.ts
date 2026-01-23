/**
 * AI Validators
 *
 * Centralized validation for AI input/output with:
 * - Input validation (prompt safety, length limits)
 * - Output validation (format, PHI detection, clinical safety)
 * - Task-specific validation (schemas, business logic)
 */

export {
  InputValidator,
  validateChatInput,
  validatePrompt,
  validateClinicalInput,
  sanitizeInput,
  type InputValidationResult,
  type InputValidationConfig,
} from './input-validator';

export {
  OutputValidator,
  validateOutput,
  validateTextOutput,
  validateStructuredOutput,
  validateClinicalOutput,
  redactPHI,
  containsPHI,
  detectPHITypes,
  type OutputValidationResult,
  type OutputValidationConfig,
} from './output-validator';

export {
  TaskValidator,
  validatePatientState,
  validateQualityGrading,
  validateDiagnosisSupport,
  validateClinicalNotes,
  validateTaskOutput,
  parseAndValidateOutput,
  isPatientState,
  isQualityGradingResult,
  PatientStateSchema,
  QualityGradingResultSchema,
  DiagnosisSupportSchema,
  ClinicalNotesSchema,
  type TaskValidationResult,
} from './task-validator';
