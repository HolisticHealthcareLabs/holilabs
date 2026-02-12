/**
 * EXTRACT MASTER DATA — IP Extraction + PII Scan
 *
 * Consolidates clinical rule files into a single validated JSON with
 * provenance metadata, and extracts billing codes from seed constants.
 *
 * PII Scan: Aborts with CRITICAL error if patient data patterns detected.
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/extract-master-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ClinicalRuleSchema,
  MasterRulesFileSchema,
  TUSSCodeSchema,
  MasterTUSSFileSchema,
} from './lib/master-data-schemas';

// ---------------------------------------------------------------------------
// PII Detection Patterns
// ---------------------------------------------------------------------------

const PII_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: 'MRN (P-NNN)', regex: /P-\d{3}\b/ },
  { name: 'Email', regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ },
  { name: 'Phone', regex: /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/ },
  { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: 'CPF (Brazil)', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { name: 'CI (Bolivia)', regex: /\b\d{7,8}-[A-Z]{2}\b/ },
  { name: 'Patient Name Pattern', regex: /\b(Maria|Juan|Carlos|Pedro|Ana)\s+(Garcia|Lopez|Martinez|Rodriguez|Fernandez)\b/i },
];

function scanForPII(obj: unknown, path: string = ''): string[] {
  const violations: string[] = [];

  if (typeof obj === 'string') {
    for (const { name, regex } of PII_PATTERNS) {
      if (regex.test(obj)) {
        violations.push(`  [${name}] at ${path}: "${obj.substring(0, 80)}..."`);
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      violations.push(...scanForPII(item, `${path}[${i}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      violations.push(...scanForPII(value, path ? `${path}.${key}` : key));
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Rule Source Files
// ---------------------------------------------------------------------------

const RULE_SOURCES = [
  { file: 'doac-rules.json', category: 'DOAC_SAFETY' },
  { file: 'contraindications-v1.json', category: 'CONTRAINDICATION' },
  { file: 'interactions-v1.json', category: 'INTERACTION' },
  { file: 'dosing-v1.json', category: 'DOSING' },
];

// ---------------------------------------------------------------------------
// Billing Codes (extracted from seed-master-data.ts constants)
// ---------------------------------------------------------------------------

const BILLING_CODES = [
  {
    code: '4.01.01.01',
    description: 'Specialized Consultation — High Complexity',
    category: 'SPECIALIZED',
    baseRateBOB: 4500,
    baseRateBRL: null,
    applicableSeverities: ['BLOCK'],
  },
  {
    code: '4.01.01.02',
    description: 'Specialized Drug Interaction Review',
    category: 'SPECIALIZED',
    baseRateBOB: 3750,
    baseRateBRL: null,
    applicableSeverities: ['FLAG'],
  },
  {
    code: '4.01.01.03',
    description: 'Specialized Consultation — Data Completion',
    category: 'SPECIALIZED',
    baseRateBOB: 3000,
    baseRateBRL: null,
    applicableSeverities: ['ATTESTATION_REQUIRED'],
  },
  {
    code: '1.01.01.01',
    description: 'Standard Visit — Low Complexity',
    category: 'STANDARD',
    baseRateBOB: 1250,
    baseRateBRL: null,
    applicableSeverities: ['PASS'],
  },
  {
    code: '1.01.01.09-6',
    description: 'Consulta em Consultório — Clínico Geral',
    category: 'STANDARD',
    baseRateBOB: 0,
    baseRateBRL: 189,
    applicableSeverities: ['PASS'],
  },
  {
    code: '1.01.01.15-0',
    description: 'Consulta em Consultório — Especialista',
    category: 'SPECIALIZED',
    baseRateBOB: 0,
    baseRateBRL: 315,
    applicableSeverities: ['BLOCK', 'FLAG'],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const sourceDir = path.join(rootDir, 'data', 'clinical', 'sources');
  const outputDir = path.join(rootDir, 'data', 'master');
  const now = new Date().toISOString();

  console.log('='.repeat(60));
  console.log('  EXTRACT MASTER DATA — IP Extraction + PII Scan');
  console.log('='.repeat(60));

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // --- Phase 1: Extract & Validate Clinical Rules ---
  console.log('\n--- Phase 1: Clinical Rules ---');

  const allRules: unknown[] = [];
  let validationErrors = 0;

  for (const { file, category } of RULE_SOURCES) {
    const filePath = path.join(sourceDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP: ${file} not found`);
      continue;
    }

    const rawRules = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  Reading ${file}: ${rawRules.length} rules (category: ${category})`);

    for (const rule of rawRules) {
      const result = ClinicalRuleSchema.safeParse(rule);
      if (!result.success) {
        console.error(`  VALIDATION FAILED for ${rule.ruleId || 'unknown'}:`);
        for (const issue of result.error.issues) {
          console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
        }
        validationErrors++;
      } else {
        allRules.push({ ...result.data, _sourceFile: file, _sourceCategory: category });
      }
    }
  }

  if (validationErrors > 0) {
    console.error(`\nABORT: ${validationErrors} validation error(s). Fix source files before extraction.`);
    process.exit(1);
  }

  console.log(`\n  Total validated rules: ${allRules.length}`);

  // --- Phase 2: PII Scan (Rules) ---
  console.log('\n--- Phase 2: PII Scan (Rules) ---');

  const rulePiiViolations = scanForPII(allRules);
  if (rulePiiViolations.length > 0) {
    console.error('\n  CRITICAL: PII DETECTED IN CLINICAL RULES');
    console.error('  =========================================');
    for (const v of rulePiiViolations) {
      console.error(v);
    }
    console.error('\n  ABORTING. Remove PII from source files before extraction.');
    process.exit(1);
  }
  console.log('  PII scan: CLEAN');

  // --- Phase 3: Write rules.json ---
  console.log('\n--- Phase 3: Write data/master/rules.json ---');

  const rulesFile = {
    $schema: 'data/master/schemas/rule.schema.json',
    version: '1.0.0',
    generatedAt: now,
    generatedBy: 'scripts/extract-master-data.ts',
    piiScanResult: 'CLEAN' as const,
    rules: allRules,
  };

  const rulesFileValidation = MasterRulesFileSchema.safeParse(rulesFile);
  if (!rulesFileValidation.success) {
    console.error('  Envelope validation failed:', rulesFileValidation.error.issues);
    process.exit(1);
  }

  const rulesOutputPath = path.join(outputDir, 'rules.json');
  fs.writeFileSync(rulesOutputPath, JSON.stringify(rulesFile, null, 2) + '\n');
  console.log(`  Written: ${rulesOutputPath} (${allRules.length} rules)`);

  // --- Phase 4: Extract & Validate Billing Codes ---
  console.log('\n--- Phase 4: Billing Codes (TUSS/CBHPM) ---');

  let codeValidationErrors = 0;
  const validatedCodes: unknown[] = [];

  for (const code of BILLING_CODES) {
    const result = TUSSCodeSchema.safeParse(code);
    if (!result.success) {
      console.error(`  VALIDATION FAILED for ${code.code}:`);
      for (const issue of result.error.issues) {
        console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
      }
      codeValidationErrors++;
    } else {
      validatedCodes.push(result.data);
    }
  }

  if (codeValidationErrors > 0) {
    console.error(`\nABORT: ${codeValidationErrors} billing code validation error(s).`);
    process.exit(1);
  }

  // PII scan on billing codes
  const codePiiViolations = scanForPII(validatedCodes);
  if (codePiiViolations.length > 0) {
    console.error('\n  CRITICAL: PII DETECTED IN BILLING CODES');
    for (const v of codePiiViolations) {
      console.error(v);
    }
    process.exit(1);
  }
  console.log('  PII scan: CLEAN');

  // --- Phase 5: Write tuss.json ---
  console.log('\n--- Phase 5: Write data/master/tuss.json ---');

  const tussFile = {
    $schema: 'data/master/schemas/tuss.schema.json',
    version: '1.0.0',
    generatedAt: now,
    generatedBy: 'scripts/extract-master-data.ts',
    piiScanResult: 'CLEAN' as const,
    codes: validatedCodes,
  };

  const tussFileValidation = MasterTUSSFileSchema.safeParse(tussFile);
  if (!tussFileValidation.success) {
    console.error('  Envelope validation failed:', tussFileValidation.error.issues);
    process.exit(1);
  }

  const tussOutputPath = path.join(outputDir, 'tuss.json');
  fs.writeFileSync(tussOutputPath, JSON.stringify(tussFile, null, 2) + '\n');
  console.log(`  Written: ${tussOutputPath} (${validatedCodes.length} codes)`);

  // --- Summary ---
  console.log('\n' + '='.repeat(60));
  console.log('  EXTRACTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Clinical Rules:  ${allRules.length}`);
  console.log(`  Billing Codes:   ${validatedCodes.length}`);
  console.log(`  PII Scan:        CLEAN`);
  console.log(`  Output:          data/master/rules.json`);
  console.log(`                   data/master/tuss.json`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('EXTRACTION FAILED:', err);
  process.exit(1);
});
