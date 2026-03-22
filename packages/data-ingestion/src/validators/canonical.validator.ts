/**
 * Canonical Record Validator
 *
 * Validates CanonicalPayload objects against minimum required fields.
 * Returns a ValidationResult with errors, warnings, and a completeness score.
 *
 * ELENA invariant: Missing lab value → INSUFFICIENT_DATA, never silently imputed.
 * CYRUS invariant: PII fields (nationalId, email) flagged for encryption check.
 */

import type {
  CanonicalPayload,
  CanonicalLabResult,
  CanonicalVitalSign,
  CanonicalDiagnosis,
  CanonicalMedication,
  CanonicalAllergy,
  CanonicalPatientDemographics,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';

export function validateCanonical(payload: CanonicalPayload): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  switch (payload.kind) {
    case 'LAB_RESULT':
      validateLabResult(payload as CanonicalLabResult, errors, warnings);
      break;
    case 'VITAL_SIGN':
      validateVitalSign(payload as CanonicalVitalSign, errors, warnings);
      break;
    case 'DIAGNOSIS':
      validateDiagnosis(payload as CanonicalDiagnosis, errors, warnings);
      break;
    case 'MEDICATION':
      validateMedication(payload as CanonicalMedication, errors, warnings);
      break;
    case 'ALLERGY':
      validateAllergy(payload as CanonicalAllergy, errors, warnings);
      break;
    case 'PATIENT_DEMOGRAPHICS':
      validatePatientDemographics(payload as CanonicalPatientDemographics, errors, warnings);
      break;
    default:
      // No specific rules for other types yet
      break;
  }

  const completenessScore = calculateCompleteness(payload);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completenessScore,
  };
}

// ─── Per-type validators ──────────────────────────────────────────────────────

function validateLabResult(
  p: CanonicalLabResult,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  // ELENA invariant: Missing lab value → INSUFFICIENT_DATA, not silently imputed
  if (p.value === '' || p.value === null || p.value === undefined) {
    errors.push({
      field: 'value',
      code: 'INSUFFICIENT_DATA',
      message: 'Lab result value is missing. ELENA invariant: must not impute missing lab values.',
    });
  }

  if (!p.testName || p.testName === 'Unknown') {
    warnings.push({
      field: 'testName',
      code: 'MISSING_TEST_NAME',
      message: 'Test name is missing or generic. LOINC code is strongly recommended.',
    });
  }

  if (!p.loincCode) {
    warnings.push({
      field: 'loincCode',
      code: 'MISSING_LOINC',
      message: 'LOINC code is missing. Interoperability and provenance will be limited.',
    });
  }

  if (!p.unit) {
    errors.push({
      field: 'unit',
      code: 'MISSING_UNIT',
      message: 'Unit is required for lab result values.',
    });
  }

  if (p.interpretation === undefined) {
    warnings.push({
      field: 'interpretation',
      code: 'MISSING_INTERPRETATION',
      message: 'Interpretation not set. Will be computed from reference range if available.',
    });
  }
}

function validateVitalSign(
  p: CanonicalVitalSign,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  if (p.value === null || p.value === undefined || isNaN(p.value)) {
    errors.push({
      field: 'value',
      code: 'INSUFFICIENT_DATA',
      message: 'Vital sign value is missing or not numeric.',
    });
  }

  if (!p.unit) {
    errors.push({
      field: 'unit',
      code: 'MISSING_UNIT',
      message: 'Unit is required for vital sign values.',
    });
  }

  // Sanity bounds checks (basic physiological ranges)
  const bounds: Partial<Record<CanonicalVitalSign['vitalType'], [number, number]>> = {
    HEART_RATE: [0, 300],
    BLOOD_GLUCOSE: [0, 1000],
    SPO2: [0, 100],
    TEMPERATURE: [25, 45],
    RESPIRATORY_RATE: [0, 100],
  };

  const bound = bounds[p.vitalType];
  if (bound && (p.value < bound[0] || p.value > bound[1])) {
    warnings.push({
      field: 'value',
      code: 'PHYSIOLOGICAL_OUTLIER',
      message: `Value ${p.value} is outside plausible physiological range [${bound[0]}, ${bound[1]}] for ${p.vitalType}.`,
    });
  }
}

function validateDiagnosis(
  p: CanonicalDiagnosis,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  if (!p.icd10Code || p.icd10Code === 'UNKNOWN') {
    errors.push({
      field: 'icd10Code',
      code: 'MISSING_ICD10',
      message: 'ICD-10 code is required for diagnoses.',
    });
  }

  // Basic ICD-10 format check (letter followed by 2 digits, optional decimal)
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;
  if (p.icd10Code && !icd10Pattern.test(p.icd10Code)) {
    warnings.push({
      field: 'icd10Code',
      code: 'INVALID_ICD10_FORMAT',
      message: `ICD-10 code "${p.icd10Code}" does not match expected format (e.g. E11.9).`,
    });
  }
}

function validateMedication(
  p: CanonicalMedication,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  if (!p.name || p.name === 'Unknown') {
    errors.push({
      field: 'name',
      code: 'MISSING_MEDICATION_NAME',
      message: 'Medication name is required.',
    });
  }

  if (!p.status) {
    errors.push({
      field: 'status',
      code: 'MISSING_STATUS',
      message: 'Medication status is required (ACTIVE, COMPLETED, STOPPED, PROPOSED).',
    });
  }

  if (!p.rxNormCode) {
    warnings.push({
      field: 'rxNormCode',
      code: 'MISSING_RXNORM',
      message: 'RxNorm code missing. Drug interaction checks will be limited.',
    });
  }
}

function validateAllergy(
  p: CanonicalAllergy,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  if (!p.allergen) {
    errors.push({
      field: 'allergen',
      code: 'MISSING_ALLERGEN',
      message: 'Allergen is required.',
    });
  }

  if (!p.type) {
    warnings.push({
      field: 'type',
      code: 'MISSING_ALLERGY_TYPE',
      message: 'Allergy type is missing (DRUG, FOOD, ENVIRONMENTAL, OTHER).',
    });
  }
}

function validatePatientDemographics(
  p: CanonicalPatientDemographics,
  errors: ValidationError[],
  warnings: ValidationWarning[],
) {
  // CYRUS invariant: nationalId and email are PII — flag for encryption
  if (p.nationalId) {
    warnings.push({
      field: 'nationalId',
      code: 'PII_REQUIRES_ENCRYPTION',
      message: 'nationalId is PII. CYRUS invariant: must be stored with encryptPHIWithVersion before persisting.',
    });
  }

  if (p.email) {
    warnings.push({
      field: 'email',
      code: 'PII_REQUIRES_ENCRYPTION',
      message: 'email is PII. Must be handled according to LGPD/HIPAA requirements.',
    });
  }
}

// ─── Completeness Score ───────────────────────────────────────────────────────

function calculateCompleteness(payload: CanonicalPayload): number {
  // Count optional fields that are populated
  const allFields = Object.keys(payload).filter(k => k !== 'kind');
  const populatedFields = allFields.filter(k => {
    const v = (payload as unknown as Record<string, unknown>)[k];
    return v !== undefined && v !== null && v !== '' && !isNaN(v as number);
  });
  return allFields.length > 0 ? populatedFields.length / allFields.length : 1;
}
