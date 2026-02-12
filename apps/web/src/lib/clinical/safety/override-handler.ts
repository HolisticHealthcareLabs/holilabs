/**
 * Override Handler
 *
 * Enforces that safety rule overrides:
 * 1. Include a required reason code from approved list
 * 2. Are logged as governance events for clinical review
 * 3. Cannot proceed without both conditions
 *
 * Reason codes reflect legitimate clinical scenarios:
 * - CLINICAL_JUDGMENT_PALLIATIVE_CARE: Patient comfort over longevity
 * - PATIENT_DECLINED_ALTERNATIVE: Patient autonomy
 * - CONTRAINDICATION_UNAVOIDABLE: No safer alternative exists
 * - TIME_CRITICAL_EMERGENCY: Life-threatening situation
 * - DOCUMENTED_TOLERANCE: Prior safe use documented
 *
 * All overrides → governance event log (audit trail) → CMO review queue
 *
 * @compliance FDA 21 CFR Part 11, HIPAA Audit Trail
 * @author Safety Core Agent
 * @since 2026-02-11
 */

import { logOverrideSubmitted, getGovernanceMetadata } from './governance-events';

/**
 * Valid reason codes for overriding a safety rule
 */
export type OverrideReasonCode =
  | 'CLINICAL_JUDGMENT_PALLIATIVE_CARE'
  | 'PATIENT_DECLINED_ALTERNATIVE'
  | 'CONTRAINDICATION_UNAVOIDABLE'
  | 'TIME_CRITICAL_EMERGENCY'
  | 'DOCUMENTED_TOLERANCE'
  | 'OTHER_DOCUMENTED';

/**
 * Metadata for each override reason code
 */
interface ReasonCodeMetadata {
  label: string;
  description: string;
  requiresDocumentation: boolean;
  requiresCMOReview: boolean;
}

const OVERRIDE_REASON_CODES: Record<OverrideReasonCode, ReasonCodeMetadata> = {
  CLINICAL_JUDGMENT_PALLIATIVE_CARE: {
    label: 'Clinical Judgment - Palliative Care',
    description:
      'Patient is in palliative care; comfort and symptom control take precedence over strict adherence to contraindications',
    requiresDocumentation: true,
    requiresCMOReview: true,
  },
  PATIENT_DECLINED_ALTERNATIVE: {
    label: 'Patient Declined Alternative',
    description: 'Safer alternative therapy offered but declined by informed patient',
    requiresDocumentation: true,
    requiresCMOReview: true,
  },
  CONTRAINDICATION_UNAVOIDABLE: {
    label: 'Contraindication Unavoidable',
    description: 'No safer alternative exists; therapeutic benefit justifies risk',
    requiresDocumentation: true,
    requiresCMOReview: true,
  },
  TIME_CRITICAL_EMERGENCY: {
    label: 'Time-Critical Emergency',
    description: 'Life-threatening emergency; delaying treatment is greater risk than contraindication',
    requiresDocumentation: true,
    requiresCMOReview: true,
  },
  DOCUMENTED_TOLERANCE: {
    label: 'Documented Prior Tolerance',
    description: 'Patient has prior documented safe use of this medication despite contraindication',
    requiresDocumentation: true,
    requiresCMOReview: false,
  },
  OTHER_DOCUMENTED: {
    label: 'Other (Documented)',
    description: 'Other clinical reason (must be documented in notes)',
    requiresDocumentation: true,
    requiresCMOReview: true,
  },
};

/**
 * Override submission parameters
 */
export interface OverrideSubmissionParams {
  ruleId: string;
  severity: 'BLOCK' | 'FLAG' | 'ATTESTATION_REQUIRED';
  reasonCode: OverrideReasonCode | null;
  actor: string; // Clinician user ID
  patientId: string;
  notes?: string;
  traceId?: string;
}

/**
 * Override validation result
 */
export interface OverrideValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Handle a safety rule override
 *
 * Throws if validation fails, logs event if successful
 *
 * @param params Override submission
 * @returns Success result with event metadata
 * @throws Error if validation fails
 */
export function handleOverride(params: OverrideSubmissionParams): {
  eventId: string;
  governance: ReturnType<typeof getGovernanceMetadata>;
  reasonCode: OverrideReasonCode;
} {
  // Validate the override submission
  const validation = validateOverride(params);
  if (!validation.valid) {
    throw new Error(`Override validation failed: ${validation.errors.join('; ')}`);
  }

  // reasonCode is guaranteed non-null after validation
  const reasonCode = params.reasonCode as OverrideReasonCode;

  // Log the override as governance event
  const eventId = generateEventId();

  logOverrideSubmitted({
    actor: params.actor,
    patientId: params.patientId,
    ruleId: params.ruleId,
    originalSeverity: params.severity,
    reasonCode,
    notes: params.notes,
    traceId: params.traceId,
  });

  const governance = getGovernanceMetadata({
    actor: params.actor,
    patientId: params.patientId,
    traceId: params.traceId,
  });

  return {
    eventId,
    governance,
    reasonCode,
  };
}

/**
 * Validate an override submission
 *
 * Checks:
 * - reasonCode is provided and valid
 * - ruleId is non-empty
 * - severity is recognized
 * - Documentation is provided if required
 *
 * @param params Override submission
 * @returns Validation result
 */
export function validateOverride(params: OverrideSubmissionParams): OverrideValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate reason code is provided
  if (!params.reasonCode) {
    errors.push('reasonCode is required');
  }

  // Validate reason code is in allowed list
  if (params.reasonCode && !isValidReasonCode(params.reasonCode)) {
    errors.push(`Invalid reasonCode: '${params.reasonCode}' is not an approved override reason`);
  }

  // Validate ruleId
  if (!params.ruleId || params.ruleId.trim() === '') {
    errors.push('ruleId is required');
  }

  // Validate severity
  const validSeverities: Array<'BLOCK' | 'FLAG' | 'ATTESTATION_REQUIRED'> = ['BLOCK', 'FLAG', 'ATTESTATION_REQUIRED'];
  if (!validSeverities.includes(params.severity)) {
    errors.push(`Invalid severity: '${params.severity}'`);
  }

  // Validate actor
  if (!params.actor || params.actor.trim() === '') {
    errors.push('actor (clinician ID) is required');
  }

  // Validate patientId
  if (!params.patientId || params.patientId.trim() === '') {
    errors.push('patientId is required');
  }

  // Check documentation requirement
  if (params.reasonCode) {
    const metadata = OVERRIDE_REASON_CODES[params.reasonCode];
    if (metadata) {
      if (metadata.requiresDocumentation && (!params.notes || params.notes.trim() === '')) {
        errors.push(`reasonCode '${params.reasonCode}' requires documentation in notes field`);
      }

      // Warn if CMO review is required
      if (metadata.requiresCMOReview) {
        warnings.push(`Override reason '${metadata.label}' flagged for Chief Medical Officer review`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check if a reason code is valid and known
 */
export function isValidReasonCode(code: any): code is OverrideReasonCode {
  return code in OVERRIDE_REASON_CODES;
}

/**
 * Get all available override reason codes
 */
export function getAvailableReasonCodes(): Array<{
  code: OverrideReasonCode;
  label: string;
  description: string;
  requiresCMOReview: boolean;
}> {
  return Object.entries(OVERRIDE_REASON_CODES).map(([code, metadata]) => ({
    code: code as OverrideReasonCode,
    label: metadata.label,
    description: metadata.description,
    requiresCMOReview: metadata.requiresCMOReview,
  }));
}

/**
 * Get metadata for a specific reason code
 */
export function getReasonCodeMetadata(code: OverrideReasonCode): ReasonCodeMetadata | null {
  return OVERRIDE_REASON_CODES[code] || null;
}

/**
 * Generate a unique event ID for governance tracking
 */
function generateEventId(): string {
  return `override-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format an override reason code for display
 */
export function formatReasonCode(code: OverrideReasonCode): string {
  const metadata = OVERRIDE_REASON_CODES[code];
  return metadata ? metadata.label : code;
}

/**
 * Check if an override reason code requires CMO review
 */
export function requiresCMOReview(code: OverrideReasonCode): boolean {
  const metadata = OVERRIDE_REASON_CODES[code];
  return metadata ? metadata.requiresCMOReview : false;
}
