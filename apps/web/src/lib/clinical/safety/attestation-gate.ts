/**
 * Attestation Gate
 *
 * Enforces that missing or stale critical clinical data must be attested to by a clinician
 * before a safety-critical prescription can proceed.
 *
 * Attestation prevents:
 * - Prescribing based on outdated lab values
 * - Guessing at missing patient metrics (weight, creatinine clearance)
 * - Assumption that "it probably hasn't changed"
 *
 * All decisions to override the gate are logged as governance events.
 *
 * @compliance FDA 21 CFR Part 11, HIPAA Audit Trail
 * @author Safety Core Agent
 * @since 2026-02-11
 */

export type AttestationReason = 'STALE_RENAL_LABS' | 'MISSING_WEIGHT' | 'MISSING_CREATININE' | 'MISSING_AGE' | 'OTHER';

/**
 * Attestation requirement result
 */
export interface AttestationGateResult {
  required: boolean;
  reason?: AttestationReason;
  missingFields?: string[];
  staleSince?: number; // hours
  threshold?: number; // hours for comparison
  message: string;
  legalBasis: string; // Why attestation is required (compliance reference)
}

/**
 * Critical field configuration
 */
interface CriticalField {
  name: string;
  validator: (value: any) => boolean;
}

const CRITICAL_FIELDS: Record<string, CriticalField> = {
  creatinineClearance: {
    name: 'Serum creatinine / CrCl',
    validator: (value) => value !== null && value !== undefined && typeof value === 'number' && value > 0,
  },
  weight: {
    name: 'Patient weight',
    validator: (value) => value !== null && value !== undefined && typeof value === 'number' && value >= 30 && value <= 300,
  },
  age: {
    name: 'Patient age',
    validator: (value) => value !== null && value !== undefined && typeof value === 'number' && value > 0 && value <= 130,
  },
};

const LAB_FRESHNESS_THRESHOLD_HOURS = 72; // 3 days

/**
 * Check if critical data is missing or stale
 *
 * @param params Patient data for attestation check
 * @returns AttestationGateResult indicating if attestation is required
 */
export function checkAttestation(params: {
  medication?: string;
  patient: {
    creatinineClearance?: number | null;
    weight?: number | null;
    age?: number | null;
    labTimestamp?: Date | string | null;
  };
}): AttestationGateResult {
  const { patient } = params;

  // ========== CHECK FOR MISSING CRITICAL FIELDS ==========
  const missingFields: string[] = [];

  for (const [fieldKey, fieldConfig] of Object.entries(CRITICAL_FIELDS)) {
    const value = patient[fieldKey as keyof typeof patient];
    if (!fieldConfig.validator(value)) {
      missingFields.push(fieldConfig.name);
    }
  }

  if (missingFields.length > 0) {
    return {
      required: true,
      missingFields,
      message: `Missing critical data: ${missingFields.join(', ')}. Clinician must attest that patient has been evaluated for these fields.`,
      legalBasis: 'FDA 21 CFR Part 11 (Electronic Signatures) - Clinical verification required for safety-critical decisions',
      reason: 'MISSING_WEIGHT' as AttestationReason, // Generic missing data reason
    };
  }

  // ========== CHECK FOR STALE LAB DATA ==========
  if (patient.labTimestamp) {
    const labDate = typeof patient.labTimestamp === 'string' ? new Date(patient.labTimestamp) : patient.labTimestamp;
    const now = new Date();
    const ageHours = (now.getTime() - labDate.getTime()) / (1000 * 60 * 60);

    if (ageHours > LAB_FRESHNESS_THRESHOLD_HOURS) {
      return {
        required: true,
        reason: 'STALE_RENAL_LABS',
        staleSince: Math.floor(ageHours),
        threshold: LAB_FRESHNESS_THRESHOLD_HOURS,
        message: `Renal function labs are stale (${Math.floor(ageHours)} hours old). Fresh labs (within ${LAB_FRESHNESS_THRESHOLD_HOURS}h) required unless clinician attests to current renal status.`,
        legalBasis: 'Clinical Practice Guidelines recommend reassessing renal function in acute/changing clinical status. Stale labs = stale prescribing decisions.',
      };
    }
  }

  // ========== ALL CHECKS PASSED ==========
  return {
    required: false,
    message: 'All critical data is current and complete.',
    legalBasis: 'Patient data validation passed.',
  };
}

/**
 * Validate a single critical field
 *
 * @param fieldName Name of field (e.g., 'creatinineClearance')
 * @param value Field value
 * @returns true if field is valid, false otherwise
 */
export function validateCriticalField(fieldName: string, value: any): boolean {
  const config = CRITICAL_FIELDS[fieldName];
  if (!config) return true; // Unknown fields don't require validation

  return config.validator(value);
}

/**
 * Get human-readable description of a critical field
 *
 * @param fieldName Field identifier
 * @returns Display name for UI/logging
 */
export function getCriticalFieldDescription(fieldName: string): string {
  const config = CRITICAL_FIELDS[fieldName];
  return config?.name ?? fieldName;
}

/**
 * Check if a lab timestamp is within acceptable freshness window
 *
 * @param labTimestamp When the lab was drawn
 * @returns { isStale: boolean, ageHours: number, threshold: number }
 */
export function checkLabFreshness(labTimestamp: Date | string | null | undefined): {
  isStale: boolean;
  ageHours: number;
  threshold: number;
} {
  if (!labTimestamp) {
    return { isStale: true, ageHours: Infinity, threshold: LAB_FRESHNESS_THRESHOLD_HOURS };
  }

  const labDate = typeof labTimestamp === 'string' ? new Date(labTimestamp) : labTimestamp;
  const now = new Date();
  const ageHours = (now.getTime() - labDate.getTime()) / (1000 * 60 * 60);

  return {
    isStale: ageHours > LAB_FRESHNESS_THRESHOLD_HOURS,
    ageHours: Math.floor(ageHours),
    threshold: LAB_FRESHNESS_THRESHOLD_HOURS,
  };
}

/**
 * Extract all failing critical fields from a patient context
 *
 * @param patient Patient data
 * @returns Array of field names that failed validation
 */
export function getFailingCriticalFields(patient: Record<string, any>): string[] {
  const failing: string[] = [];

  for (const [fieldKey, fieldConfig] of Object.entries(CRITICAL_FIELDS)) {
    const value = patient[fieldKey];
    if (!fieldConfig.validator(value)) {
      failing.push(fieldKey);
    }
  }

  return failing;
}
