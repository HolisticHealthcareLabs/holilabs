#!/usr/bin/env tsx
/**
 * Clinical Content Bundle Builder
 *
 * Reads all source JSON files from data/clinical/sources/*.json,
 * validates provenance, computes per-rule content hashes, and emits
 * a deterministic bundle to data/clinical/bundles/latest.json.
 *
 * Usage:
 *   tsx scripts/clinical/build-content-bundle.ts [--dry-run]
 *
 * Determinism guarantees:
 *   - Rules are sorted by ruleId (lexicographic, ascending).
 *   - JSON serialization uses sorted keys.
 *   - Checksum is SHA-256 of canonical rules JSON.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Inline types (no @/ alias available in scripts)
// ---------------------------------------------------------------------------

interface ClinicalProvenance {
  sourceAuthority: string;
  sourceDocument: string;
  sourceVersion: string;
  effectiveDate: string;
  jurisdiction: string;
  citationUrl?: string;
  licenseType: string;
}

interface ClinicalSourceRecord {
  ruleId: string;
  name: string;
  domain: string;
  severity: string;
  provenance: ClinicalProvenance;
  logic: Record<string, unknown>;
  intervention: { message: string; recommendation: string };
  tags?: string[];
}

interface ClinicalRuleRecord extends ClinicalSourceRecord {
  contentHash: string;
}

interface ClinicalBundleManifest {
  bundleVersion: string;
  generatedAt: string;
  checksum: string;
  ruleCount: number;
  domainCounts: Record<string, number>;
}

interface ClinicalContentBundle {
  manifest: ClinicalBundleManifest;
  rules: ClinicalRuleRecord[];
}

// ---------------------------------------------------------------------------
// Validation (mirrors content-types.ts logic for script isolation)
// ---------------------------------------------------------------------------

const PROVENANCE_REQUIRED: (keyof ClinicalProvenance)[] = [
  'sourceAuthority',
  'sourceDocument',
  'sourceVersion',
  'effectiveDate',
  'jurisdiction',
  'licenseType',
];

const ALLOWED_DOMAINS = [
  'CONTRAINDICATION',
  'INTERACTION',
  'DOSING',
  'ALLERGY',
  'CONDITION',
  'DOAC_SAFETY',
];

const ALLOWED_SEVERITIES = ['BLOCK', 'FLAG'];

function validateRecord(record: unknown, file: string, idx: number): string[] {
  const errors: string[] = [];
  if (!record || typeof record !== 'object') {
    errors.push(`[${file}][${idx}] Record must be a non-null object`);
    return errors;
  }

  const r = record as Record<string, unknown>;
  const ruleId = typeof r.ruleId === 'string' ? r.ruleId : `<unknown-${idx}>`;

  if (typeof r.ruleId !== 'string' || !r.ruleId.trim()) {
    errors.push(`[${file}][${ruleId}] ruleId is required`);
  }
  if (typeof r.name !== 'string' || !r.name.trim()) {
    errors.push(`[${file}][${ruleId}] name is required`);
  }
  if (typeof r.domain !== 'string' || !ALLOWED_DOMAINS.includes(r.domain)) {
    errors.push(`[${file}][${ruleId}] domain must be one of: ${ALLOWED_DOMAINS.join(', ')}`);
  }
  if (typeof r.severity !== 'string' || !ALLOWED_SEVERITIES.includes(r.severity)) {
    errors.push(`[${file}][${ruleId}] severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}`);
  }
  if (!r.logic || typeof r.logic !== 'object') {
    errors.push(`[${file}][${ruleId}] logic object is required`);
  }

  const intervention = r.intervention as Record<string, unknown> | undefined;
  if (!intervention || typeof intervention !== 'object') {
    errors.push(`[${file}][${ruleId}] intervention object is required`);
  } else {
    if (typeof intervention.message !== 'string' || !intervention.message) {
      errors.push(`[${file}][${ruleId}] intervention.message is required`);
    }
    if (typeof intervention.recommendation !== 'string' || !intervention.recommendation) {
      errors.push(`[${file}][${ruleId}] intervention.recommendation is required`);
    }
  }

  // Provenance
  if (!r.provenance || typeof r.provenance !== 'object') {
    errors.push(`[${file}][${ruleId}] provenance object is required`);
  } else {
    const prov = r.provenance as Record<string, unknown>;
    for (const field of PROVENANCE_REQUIRED) {
      const value = prov[field];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`[${file}][${ruleId}] provenance.${field} is required and must be non-empty`);
      }
    }
    if (prov.effectiveDate && typeof prov.effectiveDate === 'string' && Number.isNaN(Date.parse(prov.effectiveDate))) {
      errors.push(`[${file}][${ruleId}] provenance.effectiveDate must be a valid ISO-8601 date`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** Canonical JSON with sorted keys for deterministic hashing. */
function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, Object.keys(obj as object).sort());
}

/** Deep-sort JSON keys for full determinism. */
function deepSortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeys);
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return obj;
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// Main build
// ---------------------------------------------------------------------------

function main(): void {
  const isDryRun = process.argv.includes('--dry-run');
  const rootDir = path.resolve(__dirname, '..', '..');
  const sourcesDir = path.join(rootDir, 'data', 'clinical', 'sources');
  const bundlesDir = path.join(rootDir, 'data', 'clinical', 'bundles');

  // Discover source files
  if (!fs.existsSync(sourcesDir)) {
    console.error(`[ERROR] Sources directory not found: ${sourcesDir}`);
    process.exit(1);
  }

  const sourceFiles = fs
    .readdirSync(sourcesDir)
    .filter((f) => f.endsWith('.json'))
    .sort(); // deterministic file order

  console.log(`[build-content-bundle] Found ${sourceFiles.length} source file(s): ${sourceFiles.join(', ')}`);

  // Read and validate all records
  const allErrors: string[] = [];
  const allRecords: ClinicalSourceRecord[] = [];

  for (const file of sourceFiles) {
    const filePath = path.join(sourcesDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      allErrors.push(`[${file}] Failed to parse JSON: ${(e as Error).message}`);
      continue;
    }

    if (!Array.isArray(raw)) {
      allErrors.push(`[${file}] Source file must contain a JSON array of records`);
      continue;
    }

    for (let i = 0; i < raw.length; i++) {
      const recordErrors = validateRecord(raw[i], file, i);
      allErrors.push(...recordErrors);

      if (recordErrors.length === 0) {
        allRecords.push(raw[i] as ClinicalSourceRecord);
      }
    }
  }

  if (allErrors.length > 0) {
    console.error(`[build-content-bundle] Validation failed with ${allErrors.length} error(s):`);
    for (const err of allErrors) {
      console.error(`  ${err}`);
    }
    process.exit(1);
  }

  // Check for duplicate ruleIds
  const seenIds = new Set<string>();
  for (const record of allRecords) {
    if (seenIds.has(record.ruleId)) {
      console.error(`[build-content-bundle] Duplicate ruleId: ${record.ruleId}`);
      process.exit(1);
    }
    seenIds.add(record.ruleId);
  }

  // Sort deterministically by ruleId
  allRecords.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  // Build rule records with content hashes
  const rules: ClinicalRuleRecord[] = allRecords.map((record) => {
    const sorted = deepSortKeys(record);
    const contentHash = sha256(canonicalJson(sorted));
    return { ...record, contentHash };
  });

  // Build domain counts
  const domainCounts: Record<string, number> = {};
  for (const rule of rules) {
    domainCounts[rule.domain] = (domainCounts[rule.domain] || 0) + 1;
  }

  // Compute bundle checksum over the canonical rules array
  const rulesCanonical = JSON.stringify(rules.map(deepSortKeys));
  const checksum = sha256(rulesCanonical);

  const bundle: ClinicalContentBundle = {
    manifest: {
      bundleVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      checksum,
      ruleCount: rules.length,
      domainCounts,
    },
    rules,
  };

  // Output
  const bundleJson = JSON.stringify(bundle, null, 2);

  if (isDryRun) {
    console.log('[build-content-bundle] --dry-run: bundle would contain:');
    console.log(`  bundleVersion: ${bundle.manifest.bundleVersion}`);
    console.log(`  ruleCount: ${bundle.manifest.ruleCount}`);
    console.log(`  checksum: ${bundle.manifest.checksum}`);
    console.log(`  domainCounts: ${JSON.stringify(bundle.manifest.domainCounts)}`);
    console.log(`  rules: ${rules.map((r) => r.ruleId).join(', ')}`);
    console.log('[build-content-bundle] Dry run complete. No files written.');
    return;
  }

  // Write to output
  if (!fs.existsSync(bundlesDir)) {
    fs.mkdirSync(bundlesDir, { recursive: true });
  }

  const outputPath = path.join(bundlesDir, 'latest.json');
  fs.writeFileSync(outputPath, bundleJson, 'utf-8');
  console.log(`[build-content-bundle] Bundle written to ${outputPath}`);
  console.log(`  bundleVersion: ${bundle.manifest.bundleVersion}`);
  console.log(`  ruleCount: ${bundle.manifest.ruleCount}`);
  console.log(`  checksum: ${bundle.manifest.checksum}`);
}

main();
