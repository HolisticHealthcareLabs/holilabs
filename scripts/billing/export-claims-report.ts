/**
 * Billing Intelligence — Claims Report Export
 *
 * Generates structured billing data reports for:
 *   - Insurer submission (fee schedule coverage proof)
 *   - Regulatory audit (ANS/SSSalud/CNS compliance)
 *   - Internal analytics (revenue opportunity, coverage gaps)
 *
 * Output formats: CSV, JSON
 * Reports: procedure-catalog, insurer-rates, crosswalk-coverage, prior-auth-matrix
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/billing/export-claims-report.ts \
 *     --report procedure-catalog \
 *     --country BR \
 *     --format csv \
 *     --output ../../reports/
 */

import { PrismaClient, BillingSystem } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type ReportType = 'procedure-catalog' | 'insurer-rates' | 'crosswalk-coverage' | 'prior-auth-matrix' | 'all';
type OutputFormat = 'csv' | 'json';

interface ExportOptions {
  report: ReportType;
  country: string | null;
  format: OutputFormat;
  outputDir: string;
}

function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const opts: ExportOptions = {
    report: 'all',
    country: null,
    format: 'csv',
    outputDir: path.resolve(__dirname, '../../reports'),
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--report':
        opts.report = args[++i] as ReportType;
        break;
      case '--country':
        opts.country = args[++i];
        break;
      case '--format':
        opts.format = args[++i] as OutputFormat;
        break;
      case '--output':
        opts.outputDir = path.resolve(args[++i]);
        break;
    }
  }

  return opts;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

function writeReport(name: string, data: unknown, format: OutputFormat, outputDir: string) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${name}_${timestamp}.${format}`;
  const filepath = path.join(outputDir, filename);

  if (format === 'json') {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } else {
    fs.writeFileSync(filepath, data as string);
  }

  console.log(`  -> ${filepath}`);
}

// ── Report Generators ─────────────────────────────────────────────────────────

async function generateProcedureCatalog(opts: ExportOptions) {
  console.log('  Generating procedure catalog...');

  const where: Record<string, unknown> = { isActive: true };
  if (opts.country) where.country = opts.country;

  const codes = await prisma.procedureCode.findMany({
    where,
    orderBy: [{ country: 'asc' }, { system: 'asc' }, { category: 'asc' }, { code: 'asc' }],
    select: {
      code: true,
      system: true,
      version: true,
      country: true,
      category: true,
      shortDescription: true,
      referenceRateBRL: true,
      referenceRateARS: true,
      referenceRateBOB: true,
      actuarialWeight: true,
      requiresAnesthesia: true,
      requiresHospitalization: true,
      requiresCBO: true,
      effectiveDate: true,
      _count: { select: { snomedCrosswalks: true, feeScheduleLines: true } },
    },
  });

  const rows = codes.map(c => ({
    code: c.code,
    system: c.system,
    version: c.version,
    country: c.country,
    category: c.category,
    description: c.shortDescription,
    referenceRateBRL: c.referenceRateBRL ? Number(c.referenceRateBRL) : '',
    referenceRateARS: c.referenceRateARS ? Number(c.referenceRateARS) : '',
    referenceRateBOB: c.referenceRateBOB ? Number(c.referenceRateBOB) : '',
    actuarialWeight: Number(c.actuarialWeight),
    requiresAnesthesia: c.requiresAnesthesia,
    requiresHospitalization: c.requiresHospitalization,
    requiresCBO: c.requiresCBO ?? '',
    effectiveDate: c.effectiveDate.toISOString().split('T')[0],
    snomedMappings: c._count.snomedCrosswalks,
    feeScheduleLines: c._count.feeScheduleLines,
  }));

  if (opts.format === 'csv') {
    const headers = Object.keys(rows[0] ?? {});
    writeReport('procedure_catalog', toCsv(headers, rows), 'csv', opts.outputDir);
  } else {
    writeReport('procedure_catalog', rows, 'json', opts.outputDir);
  }

  console.log(`    ${rows.length} procedures exported`);
}

async function generateInsurerRates(opts: ExportOptions) {
  console.log('  Generating insurer rate comparison...');

  const where: Record<string, unknown> = {};
  if (opts.country) where.country = opts.country;

  const insurers = await prisma.insurer.findMany({
    where: { ...where, isActive: true },
    include: {
      feeSchedules: {
        where: { isActive: true },
        include: {
          lines: {
            include: {
              procedureCode: {
                select: { code: true, system: true, shortDescription: true, category: true },
              },
            },
          },
        },
      },
    },
    orderBy: [{ country: 'asc' }, { shortName: 'asc' }],
  });

  const rows: Record<string, unknown>[] = [];
  for (const ins of insurers) {
    for (const schedule of ins.feeSchedules) {
      for (const line of schedule.lines) {
        rows.push({
          insurer: ins.shortName,
          country: ins.country,
          insurerType: ins.insurerType,
          billingSystem: schedule.billingSystem,
          scheduleVersion: schedule.version,
          currency: schedule.currency,
          procedureCode: line.procedureCode.code,
          procedureDescription: line.procedureCode.shortDescription,
          category: line.procedureCode.category,
          negotiatedRate: Number(line.negotiatedRate),
          confidence: line.confidence,
          isCovered: line.isCovered,
          coverageLimit: line.coverageLimit ? Number(line.coverageLimit) : '',
          copayFlat: line.copayFlat ? Number(line.copayFlat) : '',
          copayPercent: line.copayPercent ? Number(line.copayPercent) : '',
        });
      }
    }
  }

  if (opts.format === 'csv') {
    const headers = Object.keys(rows[0] ?? {});
    writeReport('insurer_rates', toCsv(headers, rows), 'csv', opts.outputDir);
  } else {
    writeReport('insurer_rates', rows, 'json', opts.outputDir);
  }

  console.log(`    ${rows.length} rate lines exported across ${insurers.length} insurers`);
}

async function generateCrosswalkCoverage(opts: ExportOptions) {
  console.log('  Generating crosswalk coverage matrix...');

  const crosswalks = await prisma.snomedCrosswalk.findMany({
    include: {
      procedureCode: {
        select: { code: true, system: true, country: true, shortDescription: true, category: true },
      },
    },
    orderBy: [{ snomedConceptId: 'asc' }, { country: 'asc' }],
  });

  // Group by SNOMED concept
  const conceptMap = new Map<string, {
    fsn: string;
    br: { code: string; system: string; confidence: number } | null;
    ar: { code: string; system: string; confidence: number } | null;
    bo: { code: string; system: string; confidence: number } | null;
  }>();

  for (const cw of crosswalks) {
    if (!conceptMap.has(cw.snomedConceptId)) {
      conceptMap.set(cw.snomedConceptId, { fsn: cw.snomedFsn, br: null, ar: null, bo: null });
    }
    const entry = conceptMap.get(cw.snomedConceptId)!;
    const mapping = {
      code: cw.procedureCode.code,
      system: cw.procedureCode.system,
      confidence: Number(cw.confidence),
    };

    if (cw.country === 'BR') entry.br = mapping;
    else if (cw.country === 'AR') entry.ar = mapping;
    else if (cw.country === 'BO') entry.bo = mapping;
  }

  const rows = Array.from(conceptMap.entries()).map(([id, data]) => ({
    snomedConceptId: id,
    snomedFsn: data.fsn,
    brCode: data.br?.code ?? '',
    brSystem: data.br?.system ?? '',
    brConfidence: data.br?.confidence ?? '',
    arCode: data.ar?.code ?? '',
    arSystem: data.ar?.system ?? '',
    arConfidence: data.ar?.confidence ?? '',
    boCode: data.bo?.code ?? '',
    boSystem: data.bo?.system ?? '',
    boConfidence: data.bo?.confidence ?? '',
    coverageCount: (data.br ? 1 : 0) + (data.ar ? 1 : 0) + (data.bo ? 1 : 0),
  }));

  if (opts.format === 'csv') {
    const headers = Object.keys(rows[0] ?? {});
    writeReport('crosswalk_coverage', toCsv(headers, rows), 'csv', opts.outputDir);
  } else {
    writeReport('crosswalk_coverage', rows, 'json', opts.outputDir);
  }

  const full3 = rows.filter(r => r.coverageCount === 3).length;
  const partial = rows.filter(r => r.coverageCount < 3).length;
  console.log(`    ${rows.length} SNOMED concepts: ${full3} with full 3-country coverage, ${partial} partial`);
}

async function generatePriorAuthMatrix(opts: ExportOptions) {
  console.log('  Generating prior auth requirements matrix...');

  const rules = await prisma.priorAuthRule.findMany({
    include: {
      insurer: { select: { shortName: true, country: true } },
      procedureCode: {
        select: { code: true, system: true, shortDescription: true, category: true },
      },
    },
    orderBy: [{ insurer: { country: 'asc' } }, { insurer: { shortName: 'asc' } }],
  });

  const rows = rules.map(r => ({
    insurer: r.insurer.shortName,
    country: r.insurer.country,
    procedureCode: r.procedureCode.code,
    procedureSystem: r.procedureCode.system,
    procedureDescription: r.procedureCode.shortDescription,
    category: r.procedureCode.category,
    required: r.required,
    windowDays: r.windowDays ?? '',
    urgentWindowHours: r.urgentWindowHours ?? '',
    requiredDocuments: r.requiredDocuments.join('; '),
    requiredDiagnoses: r.requiredDiagnoses.join('; '),
    notes: r.notes ?? '',
    effectiveDate: r.effectiveDate.toISOString().split('T')[0],
    expirationDate: r.expirationDate?.toISOString().split('T')[0] ?? '',
  }));

  if (opts.format === 'csv') {
    const headers = Object.keys(rows[0] ?? {});
    writeReport('prior_auth_matrix', toCsv(headers, rows), 'csv', opts.outputDir);
  } else {
    writeReport('prior_auth_matrix', rows, 'json', opts.outputDir);
  }

  console.log(`    ${rows.length} prior auth rules exported`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Holi Labs — Billing Claims Report Export');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Report:  ${opts.report}`);
  console.log(`  Country: ${opts.country ?? 'all'}`);
  console.log(`  Format:  ${opts.format}`);
  console.log(`  Output:  ${opts.outputDir}\n`);

  const generators: Record<string, () => Promise<void>> = {
    'procedure-catalog': () => generateProcedureCatalog(opts),
    'insurer-rates': () => generateInsurerRates(opts),
    'crosswalk-coverage': () => generateCrosswalkCoverage(opts),
    'prior-auth-matrix': () => generatePriorAuthMatrix(opts),
  };

  if (opts.report === 'all') {
    for (const [name, gen] of Object.entries(generators)) {
      await gen();
    }
  } else if (generators[opts.report]) {
    await generators[opts.report]();
  } else {
    console.error(`Unknown report type: ${opts.report}`);
    console.error(`Available: ${Object.keys(generators).join(', ')}, all`);
    process.exit(1);
  }

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('\n Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
