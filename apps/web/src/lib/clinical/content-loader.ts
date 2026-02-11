/**
 * Clinical Content Loader
 *
 * Validates and loads a built clinical content bundle at runtime.
 * Fails fast on malformed provenance or structural issues so callers
 * never operate on untrusted rule data.
 *
 * @module lib/clinical/content-loader
 */

import type {
  ClinicalContentBundle,
  ClinicalRuleRecord,
  ContentValidationError,
} from './content-types';
import {
  PROVENANCE_REQUIRED_FIELDS,
  CLINICAL_RULE_DOMAINS,
  CLINICAL_RULE_SEVERITIES,
} from './content-types';

// ============================================================================
// Loader errors
// ============================================================================

export class ContentBundleValidationError extends Error {
  public readonly errors: ContentValidationError[];

  constructor(errors: ContentValidationError[]) {
    const summary = errors
      .slice(0, 5)
      .map((e) => `[${e.ruleId ?? 'bundle'}] ${e.field}: ${e.message}`)
      .join('; ');
    super(`Clinical content bundle validation failed (${errors.length} error(s)): ${summary}`);
    this.name = 'ContentBundleValidationError';
    this.errors = errors;
  }
}

// ============================================================================
// Validation
// ============================================================================

function validateManifest(bundle: unknown): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (!bundle || typeof bundle !== 'object') {
    errors.push({ field: 'bundle', message: 'Bundle must be a non-null object' });
    return errors;
  }

  const b = bundle as Record<string, unknown>;

  if (!b.manifest || typeof b.manifest !== 'object') {
    errors.push({ field: 'manifest', message: 'manifest object is required' });
    return errors;
  }

  const m = b.manifest as Record<string, unknown>;

  if (typeof m.bundleVersion !== 'string' || m.bundleVersion.trim().length === 0) {
    errors.push({ field: 'manifest.bundleVersion', message: 'bundleVersion is required' });
  }
  if (typeof m.generatedAt !== 'string' || Number.isNaN(Date.parse(m.generatedAt as string))) {
    errors.push({ field: 'manifest.generatedAt', message: 'generatedAt must be a valid ISO-8601 string' });
  }
  if (typeof m.checksum !== 'string' || m.checksum.trim().length === 0) {
    errors.push({ field: 'manifest.checksum', message: 'checksum is required' });
  }
  if (typeof m.ruleCount !== 'number' || m.ruleCount < 0) {
    errors.push({ field: 'manifest.ruleCount', message: 'ruleCount must be a non-negative number' });
  }

  return errors;
}

function validateRuleRecord(record: unknown, index: number): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  if (!record || typeof record !== 'object') {
    errors.push({ field: `rules[${index}]`, message: 'Rule must be a non-null object' });
    return errors;
  }

  const r = record as Record<string, unknown>;
  const ruleId = typeof r.ruleId === 'string' ? r.ruleId : `rules[${index}]`;

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
    errors.push({ ruleId, field: 'domain', message: 'domain is invalid' });
  }
  if (
    typeof r.severity !== 'string' ||
    !(CLINICAL_RULE_SEVERITIES as readonly string[]).includes(r.severity)
  ) {
    errors.push({ ruleId, field: 'severity', message: 'severity is invalid' });
  }
  if (typeof r.contentHash !== 'string' || r.contentHash.trim().length === 0) {
    errors.push({ ruleId, field: 'contentHash', message: 'contentHash is required' });
  }

  // Provenance validation (fail-fast)
  if (!r.provenance || typeof r.provenance !== 'object') {
    errors.push({ ruleId, field: 'provenance', message: 'provenance is required' });
  } else {
    const prov = r.provenance as Record<string, unknown>;
    for (const field of PROVENANCE_REQUIRED_FIELDS) {
      const value = prov[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push({
          ruleId,
          field: `provenance.${field}`,
          message: `Missing or empty required provenance field "${field}"`,
        });
      }
    }
  }

  return errors;
}

// ============================================================================
// Public loader
// ============================================================================

/**
 * Validate a raw bundle object (typically parsed from JSON).
 * Returns all validation errors. Empty array means valid.
 */
export function validateBundle(raw: unknown): ContentValidationError[] {
  const errors: ContentValidationError[] = [];

  errors.push(...validateManifest(raw));
  if (errors.length > 0) return errors;

  const bundle = raw as Record<string, unknown>;
  const rules = bundle.rules;
  if (!Array.isArray(rules)) {
    errors.push({ field: 'rules', message: 'rules must be an array' });
    return errors;
  }

  for (let i = 0; i < rules.length; i++) {
    errors.push(...validateRuleRecord(rules[i], i));
  }

  // Verify ruleCount matches
  const manifest = bundle.manifest as Record<string, unknown>;
  if (typeof manifest.ruleCount === 'number' && manifest.ruleCount !== rules.length) {
    errors.push({
      field: 'manifest.ruleCount',
      message: `ruleCount (${manifest.ruleCount}) does not match actual rules length (${rules.length})`,
    });
  }

  return errors;
}

/**
 * Load and validate a clinical content bundle.
 * Throws `ContentBundleValidationError` if the bundle is malformed.
 */
export function loadBundle(raw: unknown): ClinicalContentBundle {
  const errors = validateBundle(raw);
  if (errors.length > 0) {
    throw new ContentBundleValidationError(errors);
  }
  return raw as ClinicalContentBundle;
}

/**
 * Load bundle from a JSON string. Convenience wrapper.
 */
export function loadBundleFromJson(json: string): ClinicalContentBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new ContentBundleValidationError([
      { field: 'json', message: 'Invalid JSON string' },
    ]);
  }
  return loadBundle(parsed);
}

/**
 * Extract just the rule records from a validated bundle.
 */
export function extractRules(bundle: ClinicalContentBundle): ClinicalRuleRecord[] {
  return bundle.rules;
}
