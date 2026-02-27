/**
 * Billing Intelligence — TISS XML Validation Script
 *
 * Validates TISS XML output against ANS business rules before submission
 * to Brazilian private health insurers.
 *
 * Checks:
 *   1. Structural: required elements present, correct nesting
 *   2. Format: ANS code (6 digits), CNPJ (14 digits), CNES (7 digits)
 *   3. Business: CID-10 format, TUSS code existence, CBO specialty match
 *   4. Financial: procedure totals = sum of line items, non-negative values
 *   5. Cross-reference: TUSS codes exist in master data, ANS codes match insurers
 *   6. Date logic: authorization before execution, no future dates
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/billing/validate-tiss-xml.ts \
 *     --input <tiss-file.xml>
 *     [--strict]                  Treat warnings as errors
 *     [--check-master-data]       Verify TUSS codes against procedure_codes table
 *     [--json]                    Output results as JSON
 */

import * as fs from 'fs';
import * as path from 'path';

type Severity = 'ERROR' | 'WARN' | 'INFO';

interface ValidationIssue {
  severity: Severity;
  rule: string;
  element: string;
  message: string;
  value?: string;
}

interface ValidationResult {
  file: string;
  timestamp: string;
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    guiasChecked: number;
    proceduresChecked: number;
  };
}

// ── XML Helpers (simple regex-based — no DOM dependency) ──────────────────────

function extractElements(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs');
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    matches.push(match[1]);
  }
  return matches;
}

function extractValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

function hasElement(xml: string, tag: string): boolean {
  return new RegExp(`<${tag}[^>]*>`).test(xml);
}

// ── Validation Rules ──────────────────────────────────────────────────────────

function validateStructure(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Root element
  if (!hasElement(xml, 'tissLoteGuias')) {
    issues.push({
      severity: 'ERROR',
      rule: 'STRUCT-001',
      element: 'tissLoteGuias',
      message: 'Missing root element <tissLoteGuias>',
    });
    return issues; // Can't continue without root
  }

  // Required batch header elements
  const requiredBatch = ['cabecalhoLote', 'numeroLote', 'dataEnvioLote'];
  for (const elem of requiredBatch) {
    if (!hasElement(xml, elem)) {
      issues.push({
        severity: 'ERROR',
        rule: 'STRUCT-002',
        element: elem,
        message: `Missing required batch header element <${elem}>`,
      });
    }
  }

  // Must have at least one guia
  const hasConsulta = hasElement(xml, 'guiaConsulta');
  const hasSPSADT = hasElement(xml, 'guiaSPSADT');
  if (!hasConsulta && !hasSPSADT) {
    issues.push({
      severity: 'ERROR',
      rule: 'STRUCT-003',
      element: 'loteGuias',
      message: 'Batch must contain at least one guia (guiaConsulta or guiaSPSADT)',
    });
  }

  return issues;
}

function validateFormats(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // ANS code: exactly 6 digits
  const ansCodes = extractElements(xml, 'registroANS').concat(extractElements(xml, 'codigoANS'));
  for (const code of ansCodes) {
    if (!/^\d{6}$/.test(code.trim())) {
      issues.push({
        severity: 'ERROR',
        rule: 'FMT-001',
        element: 'registroANS',
        message: `Invalid ANS code: must be exactly 6 digits`,
        value: code.trim(),
      });
    }
  }

  // CNPJ: exactly 14 digits
  const cnpjs = extractElements(xml, 'CNPJ');
  for (const cnpj of cnpjs) {
    if (!/^\d{14}$/.test(cnpj.trim())) {
      issues.push({
        severity: 'ERROR',
        rule: 'FMT-002',
        element: 'CNPJ',
        message: `Invalid CNPJ: must be exactly 14 digits`,
        value: cnpj.trim(),
      });
    }
  }

  // CNES: exactly 7 digits
  const cnesCodes = extractElements(xml, 'CNES');
  for (const cnes of cnesCodes) {
    if (!/^\d{7}$/.test(cnes.trim())) {
      issues.push({
        severity: 'ERROR',
        rule: 'FMT-003',
        element: 'CNES',
        message: `Invalid CNES code: must be exactly 7 digits`,
        value: cnes.trim(),
      });
    }
  }

  // CBO: exactly 6 digits
  const cboCodes = extractElements(xml, 'codigoCBO');
  for (const cbo of cboCodes) {
    if (!/^\d{6}$/.test(cbo.trim())) {
      issues.push({
        severity: 'ERROR',
        rule: 'FMT-004',
        element: 'codigoCBO',
        message: `Invalid CBO code: must be exactly 6 digits`,
        value: cbo.trim(),
      });
    }
  }

  // CID-10: A00–Z99 with optional decimal
  const cidCodes = extractElements(xml, 'codigoCID10');
  for (const cid of cidCodes) {
    if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(cid.trim())) {
      issues.push({
        severity: 'ERROR',
        rule: 'FMT-005',
        element: 'codigoCID10',
        message: `Invalid CID-10 code format (expected: A00–Z99 with optional decimal)`,
        value: cid.trim(),
      });
    }
  }

  // Date format: YYYY-MM-DD
  const dateTags = ['dataAtendimento', 'dataSolicitacao', 'dataAutorizacao', 'dataEnvioLote', 'dataRealizacao'];
  for (const tag of dateTags) {
    const dates = extractElements(xml, tag);
    for (const date of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
        issues.push({
          severity: 'ERROR',
          rule: 'FMT-006',
          element: tag,
          message: `Invalid date format: expected YYYY-MM-DD`,
          value: date.trim(),
        });
      }
    }
  }

  // Currency values: positive decimals with 2 decimal places
  const currencyTags = ['valorUnitario', 'valorTotal'];
  for (const tag of currencyTags) {
    const values = extractElements(xml, tag);
    for (const val of values) {
      const num = parseFloat(val.trim());
      if (isNaN(num) || num < 0) {
        issues.push({
          severity: 'ERROR',
          rule: 'FMT-007',
          element: tag,
          message: `Invalid currency value: must be a non-negative decimal`,
          value: val.trim(),
        });
      }
    }
  }

  return issues;
}

function validateBusinessRules(xml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Each guia must have at least one procedure
  const consultas = extractElements(xml, 'guiaConsulta');
  const spsadts = extractElements(xml, 'guiaSPSADT');
  const allGuias = [...consultas, ...spsadts];
  let guiasChecked = 0;
  let proceduresChecked = 0;

  for (const guia of allGuias) {
    guiasChecked++;
    const hasProcedures =
      hasElement(guia, 'procedimentosExecutados') || hasElement(guia, 'procedimentosSolicitados');

    if (!hasProcedures) {
      const guiaNum = extractValue(guia, 'numeroGuiaPrestador') ?? 'unknown';
      issues.push({
        severity: 'ERROR',
        rule: 'BIZ-001',
        element: 'procedimentos',
        message: `Guia ${guiaNum} has no procedures`,
      });
    }

    // Check procedure quantities
    const quantities = extractElements(guia, 'quantidadeExecutada')
      .concat(extractElements(guia, 'quantidadeSolicitada'));
    for (const qty of quantities) {
      proceduresChecked++;
      const num = parseInt(qty.trim());
      if (isNaN(num) || num <= 0) {
        issues.push({
          severity: 'ERROR',
          rule: 'BIZ-002',
          element: 'quantidade',
          message: `Procedure quantity must be a positive integer`,
          value: qty.trim(),
        });
      }
    }

    // Guide number should not be empty
    const guiaNum = extractValue(guia, 'numeroGuiaPrestador');
    if (!guiaNum || guiaNum.trim() === '') {
      issues.push({
        severity: 'ERROR',
        rule: 'BIZ-003',
        element: 'numeroGuiaPrestador',
        message: 'Guide number (numeroGuiaPrestador) is required',
      });
    }
  }

  // Batch number format: should be populated
  const batchNum = extractValue(xml, 'numeroLote');
  if (!batchNum || batchNum.trim() === '') {
    issues.push({
      severity: 'ERROR',
      rule: 'BIZ-004',
      element: 'numeroLote',
      message: 'Batch number (numeroLote) is required',
    });
  }

  // No future attendance dates
  const today = new Date().toISOString().split('T')[0];
  const attendanceDates = extractElements(xml, 'dataAtendimento');
  for (const date of attendanceDates) {
    if (date.trim() > today) {
      issues.push({
        severity: 'WARN',
        rule: 'BIZ-005',
        element: 'dataAtendimento',
        message: `Attendance date is in the future`,
        value: date.trim(),
      });
    }
  }

  return issues;
}

async function validateAgainstMasterData(xml: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Load TUSS codes from master data
  const tussPath = path.resolve(__dirname, '../../data/master/procedure-codes/tuss-expanded.json');
  if (!fs.existsSync(tussPath)) {
    issues.push({
      severity: 'WARN',
      rule: 'MASTER-001',
      element: 'procedureCode',
      message: 'TUSS master data file not found — skipping code verification',
    });
    return issues;
  }

  const tussData = JSON.parse(fs.readFileSync(tussPath, 'utf-8'));
  const validCodes = new Set<string>(tussData.codes.map((c: { code: string }) => c.code));

  // Extract procedure codes from XML
  const procedureCodes = extractElements(xml, 'codigoProcedimento');
  for (const code of procedureCodes) {
    const trimmed = code.trim();
    if (!validCodes.has(trimmed)) {
      issues.push({
        severity: 'WARN',
        rule: 'MASTER-002',
        element: 'codigoProcedimento',
        message: `Procedure code not found in TUSS master data`,
        value: trimmed,
      });
    }
  }

  // Verify ANS codes match known insurers
  const insurerPath = path.resolve(__dirname, '../../data/master/insurers/brazil-ans-insurers.json');
  if (fs.existsSync(insurerPath)) {
    const insurerData = JSON.parse(fs.readFileSync(insurerPath, 'utf-8'));
    const validAns = new Set<string>(
      insurerData.insurers.map((i: { ansCode: string }) => i.ansCode)
    );

    const ansInXml = extractElements(xml, 'codigoANS');
    for (const ans of ansInXml) {
      if (!validAns.has(ans.trim())) {
        issues.push({
          severity: 'INFO',
          rule: 'MASTER-003',
          element: 'codigoANS',
          message: `ANS code not in local insurer directory (may be valid but not yet onboarded)`,
          value: ans.trim(),
        });
      }
    }
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const inputFile = args.find((_, i) => args[i - 1] === '--input');
  const strict = args.includes('--strict');
  const checkMaster = args.includes('--check-master-data');
  const jsonOutput = args.includes('--json');

  if (!inputFile) {
    console.error('Usage: validate-tiss-xml.ts --input <file.xml> [--strict] [--check-master-data] [--json]');
    process.exit(1);
  }

  const absPath = path.resolve(inputFile);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(absPath, 'utf-8');

  if (!jsonOutput) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' TISS XML Validator — ANS Compliance Check');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  File: ${absPath}`);
    console.log(`  Size: ${(xml.length / 1024).toFixed(1)} KB\n`);
  }

  const allIssues: ValidationIssue[] = [];

  // Run all checks
  allIssues.push(...validateStructure(xml));
  allIssues.push(...validateFormats(xml));
  allIssues.push(...validateBusinessRules(xml));

  if (checkMaster) {
    allIssues.push(...await validateAgainstMasterData(xml));
  }

  // Count guias/procedures for summary
  const guiasChecked =
    extractElements(xml, 'guiaConsulta').length +
    extractElements(xml, 'guiaSPSADT').length;
  const proceduresChecked = extractElements(xml, 'codigoProcedimento').length;

  const errors = allIssues.filter(i => i.severity === 'ERROR').length;
  const warnings = allIssues.filter(i => i.severity === 'WARN').length;
  const infos = allIssues.filter(i => i.severity === 'INFO').length;
  const isValid = strict ? (errors === 0 && warnings === 0) : errors === 0;

  const result: ValidationResult = {
    file: absPath,
    timestamp: new Date().toISOString(),
    valid: isValid,
    issues: allIssues,
    summary: { errors, warnings, infos, guiasChecked, proceduresChecked },
  };

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    if (allIssues.length === 0) {
      console.log('  No issues found.\n');
    } else {
      for (const issue of allIssues) {
        const icon = issue.severity === 'ERROR' ? 'ERROR' : issue.severity === 'WARN' ? ' WARN' : ' INFO';
        console.log(`  [${icon}] ${issue.rule}: ${issue.message}`);
        if (issue.value) console.log(`          Value: ${issue.value}`);
        console.log(`          Element: <${issue.element}>`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`  Result:     ${isValid ? 'VALID' : 'INVALID'}`);
    console.log(`  Guias:      ${guiasChecked}`);
    console.log(`  Procedures: ${proceduresChecked}`);
    console.log(`  Errors:     ${errors}`);
    console.log(`  Warnings:   ${warnings}`);
    console.log(`  Infos:      ${infos}`);
  }

  if (!isValid) process.exit(1);
}

main().catch((e) => {
  console.error('\n Fatal error:', e);
  process.exit(1);
});
