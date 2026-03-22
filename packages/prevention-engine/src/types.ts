/**
 * @holi/prevention-engine — Type Definitions
 *
 * ELENA invariant: every ClinicalRule MUST have sourceAuthority + citationUrl.
 * If either is missing at rule load time → throw. Never silently pass.
 *
 * @module @holi/prevention-engine/types
 */

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL RULE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type RuleSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RuleCategory =
  | 'LAB_ALERT'
  | 'VITAL_ALERT'
  | 'SCREENING_GAP'
  | 'DRUG_INTERACTION'
  | 'SOCIAL_RISK'
  | 'IMAGING_OVERDUE'
  | 'FAMILY_HISTORY_ESCALATION';

export type RuleConditionOperator =
  | '>'
  | '>='
  | '<'
  | '<='
  | '=='
  | '!='
  | 'MISSING'
  | 'OVERDUE_BY_DAYS'
  | 'CONTAINS_ICD_PREFIX';

export interface RuleCondition {
  field: string;                       // dot-notation path in CanonicalPayload
  operator: RuleConditionOperator;
  value?: number | string | boolean;   // threshold (undefined for MISSING/OVERDUE)
  unit?: string;                       // expected unit for numeric comparisons
}

/**
 * ELENA invariant: sourceAuthority + citationUrl are MANDATORY.
 * RuleRegistry throws at load time if either is absent.
 * LLM output MUST NOT be used as sourceAuthority.
 */
export interface ClinicalRule {
  ruleId: string;
  name: string;
  category: RuleCategory;
  targetRecordType: string;           // CanonicalRecordType value
  condition: RuleCondition;
  severity: RuleSeverity;
  message: string;                    // human-readable alert text (non-PHI)
  actionRequired: string;             // recommended clinical action
  sourceAuthority: string;            // e.g. "ADA Standards of Diabetes Care 2024"
  citationUrl: string;                // Must be a valid URL — ELENA invariant
  // RUTH: ANVISA SaMD: Class I — informational alerts, not diagnostic decisions
  /** For FAMILY_HISTORY_ESCALATION rules: which existing rule this escalates */
  escalatesRule?: string;
  /** For FAMILY_HISTORY_ESCALATION rules: the escalated severity level */
  escalatedSeverity?: RuleSeverity;
}

export interface RuleResult {
  ruleId: string;
  matched: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVENTION ALERT
// ─────────────────────────────────────────────────────────────────────────────

export interface PreventionAlert {
  alertId: string;
  patientId: string;
  tenantId: string;
  rule: ClinicalRule;
  severity: RuleSeverity;
  message: string;
  actionRequired: string;
  citationUrl: string;
  triggeredAt: Date;
  recordType: string;
  sourceRecordId: string;
  // ELENA: humanReviewRequired flag for any AI-adjacent logic
  humanReviewRequired: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT HISTORY (minimal — prevention engine does not own patient data)
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientHistory {
  patientId: string;
  tenantId: string;
  /** Most recent lab results by LOINC code */
  lastLabResults?: Record<string, { value: number; unit: string; date: Date }>;
  /** Most recent vitals by type */
  lastVitals?: Record<string, { value: number; unit: string; date: Date }>;
  /** Last completed screening dates by screening type */
  lastScreeningDates?: Record<string, Date>;
  /** Active medications (generic names only — CYRUS: no full prescription details) */
  activeMedications?: string[];
  /** Date of birth for age-based screening rules */
  dateOfBirth?: Date;
  /** Biological sex for sex-specific screening guidelines */
  biologicalSex?: 'MALE' | 'FEMALE' | 'OTHER';
  /** Family history for escalation rules */
  familyHistory?: Array<{
    relationship: string;
    conditions: Array<{
      icdCode: string;
      display: string;
    }>;
  }>;
}
