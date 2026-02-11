/**
 * Clinical Content Provenance Types
 *
 * Source-of-truth type definitions for the clinical content registry.
 * Every rule/record must carry provenance metadata so downstream KPIs,
 * audits, and governance queries are traceable to an authoritative source.
 *
 * @module lib/clinical/content-types
 */

// ============================================================================
// Provenance
// ============================================================================

/** Required provenance for every clinical content record. */
export interface ClinicalProvenance {
  /** Issuing body (e.g. "GINA Guidelines", "FDA"). */
  sourceAuthority: string;
  /** Specific document/publication (e.g. "GINA 2024 Report"). */
  sourceDocument: string;
  /** Edition/version of the source (e.g. "2024-rev1"). */
  sourceVersion: string;
  /** ISO-8601 date when the guidance became effective. */
  effectiveDate: string;
  /** ISO-3166-1 alpha-2 jurisdiction code or "INTL". */
  jurisdiction: string;
  /** Optional URL to the authoritative document. */
  citationUrl?: string;
  /** License under which content is distributed (e.g. "CC-BY-4.0", "proprietary"). */
  licenseType: string;
}

/** Fields that must be non-empty strings for provenance to be valid. */
export const PROVENANCE_REQUIRED_FIELDS: readonly (keyof ClinicalProvenance)[] = [
  'sourceAuthority',
  'sourceDocument',
  'sourceVersion',
  'effectiveDate',
  'jurisdiction',
  'licenseType',
] as const;

// ============================================================================
// Rule domains
// ============================================================================

export const CLINICAL_RULE_DOMAINS = [
  'CONTRAINDICATION',
  'INTERACTION',
  'DOSING',
  'ALLERGY',
  'CONDITION',
  'DOAC_SAFETY',
] as const;

export type ClinicalRuleDomain = (typeof CLINICAL_RULE_DOMAINS)[number];

export const CLINICAL_RULE_SEVERITIES = ['BLOCK', 'FLAG'] as const;
export type ClinicalRuleSeverity = (typeof CLINICAL_RULE_SEVERITIES)[number];

// ============================================================================
// Source record (raw JSON ingested from data/clinical/sources/*.json)
// ============================================================================

/** Shape of a single rule as authored in a source JSON file. */
export interface ClinicalSourceRecord {
  ruleId: string;
  name: string;
  domain: ClinicalRuleDomain;
  severity: ClinicalRuleSeverity;
  provenance: ClinicalProvenance;
  logic: Record<string, unknown>;
  intervention: {
    message: string;
    recommendation: string;
  };
  /** Optional tags for search/filtering. */
  tags?: string[];
}

// ============================================================================
// Bundle-level rule record (enriched at build time)
// ============================================================================

/** Rule as stored inside a built bundle. */
export interface ClinicalRuleRecord extends ClinicalSourceRecord {
  /** SHA-256 hex digest of the canonical JSON of this rule (sans checksum). */
  contentHash: string;
}

// ============================================================================
// Bundle manifest
// ============================================================================

export interface ClinicalBundleManifest {
  /** Monotonically increasing bundle version, e.g. "1.0.0" or timestamp-based. */
  bundleVersion: string;
  /** ISO-8601 timestamp of generation. */
  generatedAt: string;
  /** SHA-256 hex digest of the deterministic canonical JSON of rules[]. */
  checksum: string;
  /** Total rule count. */
  ruleCount: number;
  /** Domain → count breakdown. */
  domainCounts: Record<string, number>;
}

export interface ClinicalContentBundle {
  manifest: ClinicalBundleManifest;
  rules: ClinicalRuleRecord[];
}

// ============================================================================
// Validation helpers
// ============================================================================

export interface ContentValidationError {
  ruleId?: string;
  field: string;
  message: string;
}

/**
 * Validate provenance on a single source record.
 * Returns an empty array when valid.
 */
export function validateProvenance(
  record: ClinicalSourceRecord,
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  for (const field of PROVENANCE_REQUIRED_FIELDS) {
    const value = record.provenance?.[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push({
        ruleId: record.ruleId,
        field: `provenance.${field}`,
        message: `Missing or empty required provenance field "${field}"`,
      });
    }
  }

  // effectiveDate must parse as a valid date
  if (
    record.provenance?.effectiveDate &&
    Number.isNaN(Date.parse(record.provenance.effectiveDate))
  ) {
    errors.push({
      ruleId: record.ruleId,
      field: 'provenance.effectiveDate',
      message: 'effectiveDate must be a valid ISO-8601 date string',
    });
  }

  return errors;
}

/**
 * Validate the structural completeness of a source record (beyond provenance).
 */
export function validateSourceRecord(
  record: unknown,
): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (!record || typeof record !== 'object') {
    errors.push({ field: 'root', message: 'Record must be a non-null object' });
    return errors;
  }

  const r = record as Record<string, unknown>;
  const ruleId = typeof r.ruleId === 'string' ? r.ruleId : '<unknown>';

  if (typeof r.ruleId !== 'string' || r.ruleId.trim().length === 0) {
    errors.push({ ruleId, field: 'ruleId', message: 'ruleId is required' });
  }
  if (typeof r.name !== 'string' || r.name.trim().length === 0) {
    errors.push({ ruleId, field: 'name', message: 'name is required' });
  }
  if (
    typeof r.domain !== 'string' ||
    !(CLINICAL_RULE_DOMAINS as readonly string[]).includes(r.domain)
  ) {
    errors.push({
      ruleId,
      field: 'domain',
      message: `domain must be one of: ${CLINICAL_RULE_DOMAINS.join(', ')}`,
    });
  }
  if (
    typeof r.severity !== 'string' ||
    !(CLINICAL_RULE_SEVERITIES as readonly string[]).includes(r.severity)
  ) {
    errors.push({
      ruleId,
      field: 'severity',
      message: `severity must be one of: ${CLINICAL_RULE_SEVERITIES.join(', ')}`,
    });
  }
  if (!r.logic || typeof r.logic !== 'object') {
    errors.push({ ruleId, field: 'logic', message: 'logic object is required' });
  }

  const intervention = r.intervention as Record<string, unknown> | undefined;
  if (!intervention || typeof intervention !== 'object') {
    errors.push({ ruleId, field: 'intervention', message: 'intervention object is required' });
  } else {
    if (typeof intervention.message !== 'string' || !intervention.message) {
      errors.push({ ruleId, field: 'intervention.message', message: 'intervention.message is required' });
    }
    if (typeof intervention.recommendation !== 'string' || !intervention.recommendation) {
      errors.push({ ruleId, field: 'intervention.recommendation', message: 'intervention.recommendation is required' });
    }
  }

  // Provenance sub-validation
  if (!r.provenance || typeof r.provenance !== 'object') {
    errors.push({ ruleId, field: 'provenance', message: 'provenance object is required' });
  } else {
    errors.push(...validateProvenance(r as unknown as ClinicalSourceRecord));
  }

  return errors;
}
