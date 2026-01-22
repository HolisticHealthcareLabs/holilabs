/**
 * AI Domain Validators
 *
 * Central export for medical domain validators.
 */

// Medical terminology
export {
  validateAbbreviation,
  expandAbbreviations,
  checkDangerousAbbreviations,
  validateMedicalTerm,
  validateMedicalTerms,
  type TermValidationResult,
} from './medical-terms';

// Drug interactions
export {
  getRxCUI,
  checkDrugInteractions,
  checkNewDrugInteractions,
  filterHighSeverityInteractions,
  formatInteractionWarning,
  type InteractionSeverity,
  type DrugInteraction,
  type InteractionCheckResult,
} from './drug-interactions';

// ICD-10 codes
export {
  validateICD10Format,
  validateICD10Code,
  validateICD10Codes,
  getICD10Chapter,
  formatICD10Code,
  extractICD10Codes,
  type ICD10ValidationResult,
} from './icd10-validator';
