/**
 * Billing Intelligence — Compliance Audit Script
 *
 * Deep compliance analysis across the tri-country billing system.
 * Goes beyond seed validation to check:
 *   - Rate coverage gaps (procedures with no fee schedule lines)
 *   - Crosswalk completeness (unmapped high-frequency SNOMED concepts)
 *   - Regulatory field validation (ANS/ANMAT/CNS required fields)
 *   - Rate anomaly detection (outliers vs reference rates)
 *   - Prior auth coverage (high-cost procedures without auth rules)
 *   - Data freshness (stale effective dates)
 *
 * Usage: cd apps/web && pnpm exec tsx ../../scripts/billing/audit-billing-compliance.ts
 *        [--country BR|AR|BO]  [--severity ERROR|WARN|INFO]  [--json]
 */

import { PrismaClient, BillingSystem } from '@prisma/client';

const prisma = new PrismaClient();

type Severity = 'ERROR' | 'WARN' | 'INFO';

interface AuditFinding {
  severity: Severity;
  category: string;
  check: string;
  details: string;
  affectedEntities: string[];
}

interface AuditReport {
  timestamp: string;
  totalChecks: number;
  findings: AuditFinding[];
  summary: { errors: number; warnings: number; infos: number };
}

// ── Audit Checks ──────────────────────────────────────────────────────────────

async function checkRateCoverageGaps(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // Find active procedure codes with no fee schedule lines at all
  const uncoveredCodes = await prisma.procedureCode.findMany({
    where: {
      isActive: true,
      feeScheduleLines: { none: {} },
    },
    select: { code: true, system: true, country: true, category: true, shortDescription: true },
  });

  if (uncoveredCodes.length > 0) {
    const byCountry: Record<string, string[]> = {};
    for (const c of uncoveredCodes) {
      const key = c.country;
      if (!byCountry[key]) byCountry[key] = [];
      byCountry[key].push(`${c.code} (${c.category})`);
    }

    for (const [country, codes] of Object.entries(byCountry)) {
      findings.push({
        severity: codes.length > 50 ? 'WARN' : 'INFO',
        category: 'RATE_COVERAGE',
        check: `Procedure codes without fee schedule lines (${country})`,
        details: `${codes.length} active codes have no insurer-specific rates. They will fall back to reference rates.`,
        affectedEntities: codes.slice(0, 20),
      });
    }
  }

  return findings;
}

async function checkCrosswalkCompleteness(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // Find procedure codes with no SNOMED crosswalk
  const uncrosswalked = await prisma.procedureCode.findMany({
    where: {
      isActive: true,
      snomedCrosswalks: { none: {} },
    },
    select: { code: true, system: true, country: true, category: true },
  });

  if (uncrosswalked.length > 0) {
    const byCountry: Record<string, string[]> = {};
    for (const c of uncrosswalked) {
      if (!byCountry[c.country]) byCountry[c.country] = [];
      byCountry[c.country].push(`${c.code} (${c.category})`);
    }

    for (const [country, codes] of Object.entries(byCountry)) {
      findings.push({
        severity: 'WARN',
        category: 'CROSSWALK_COMPLETENESS',
        check: `Procedure codes without SNOMED crosswalk (${country})`,
        details: `${codes.length} active codes cannot be resolved via SNOMED concept lookup. Clinicians must use direct billing codes.`,
        affectedEntities: codes.slice(0, 20),
      });
    }
  }

  // Find SNOMED concepts with partial country coverage
  const crosswalks = await prisma.snomedCrosswalk.findMany({
    select: { snomedConceptId: true, snomedFsn: true, country: true },
  });

  const conceptCountries = new Map<string, { fsn: string; countries: Set<string> }>();
  for (const cw of crosswalks) {
    if (!conceptCountries.has(cw.snomedConceptId)) {
      conceptCountries.set(cw.snomedConceptId, { fsn: cw.snomedFsn, countries: new Set() });
    }
    conceptCountries.get(cw.snomedConceptId)!.countries.add(cw.country);
  }

  const partialCoverage: string[] = [];
  for (const [id, data] of conceptCountries) {
    if (data.countries.size < 3) {
      const missing = ['BR', 'AR', 'BO'].filter(c => !data.countries.has(c));
      partialCoverage.push(`${id} (${data.fsn}) — missing: ${missing.join(', ')}`);
    }
  }

  if (partialCoverage.length > 0) {
    findings.push({
      severity: 'WARN',
      category: 'CROSSWALK_COMPLETENESS',
      check: 'SNOMED concepts with partial country coverage',
      details: `${partialCoverage.length} SNOMED concepts have crosswalks for some but not all 3 countries.`,
      affectedEntities: partialCoverage.slice(0, 15),
    });
  }

  return findings;
}

async function checkRegulatoryFields(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // Brazil: ANS insurers must have ansCode
  const brInsurersNoAns = await prisma.insurer.findMany({
    where: { country: 'BR', isActive: true, ansCode: null },
    select: { shortName: true },
  });
  if (brInsurersNoAns.length > 0) {
    findings.push({
      severity: 'ERROR',
      category: 'REGULATORY',
      check: 'Brazilian insurers missing ANS code',
      details: 'ANS registration code is mandatory for all Brazilian private health insurers per RN 305/2012.',
      affectedEntities: brInsurersNoAns.map(i => i.shortName),
    });
  }

  // Argentina: must have RNOS or CUIT
  const arInsurersNoId = await prisma.insurer.findMany({
    where: { country: 'AR', isActive: true, rnos: null, cuitCode: null },
    select: { shortName: true },
  });
  if (arInsurersNoId.length > 0) {
    findings.push({
      severity: 'ERROR',
      category: 'REGULATORY',
      check: 'Argentine insurers missing RNOS/CUIT',
      details: 'RNOS (Registro Nacional de Obras Sociales) or CUIT is mandatory for Argentine payers per SSSalud regulations.',
      affectedEntities: arInsurersNoId.map(i => i.shortName),
    });
  }

  // Bolivia: must have cnsCode
  const boInsurersNoCode = await prisma.insurer.findMany({
    where: { country: 'BO', isActive: true, cnsCode: null },
    select: { shortName: true },
  });
  if (boInsurersNoCode.length > 0) {
    findings.push({
      severity: 'ERROR',
      category: 'REGULATORY',
      check: 'Bolivian insurers missing CNS code',
      details: 'CNS institutional code is mandatory for Bolivian payers.',
      affectedEntities: boInsurersNoCode.map(i => i.shortName),
    });
  }

  // Brazil: TUSS codes should have CBO requirement for specialist consultations
  const specialistNoCBO = await prisma.procedureCode.findMany({
    where: {
      country: 'BR',
      system: BillingSystem.TUSS,
      category: 'SPECIALIZED',
      isActive: true,
      requiresCBO: null,
    },
    select: { code: true, shortDescription: true },
  });
  if (specialistNoCBO.length > 0) {
    findings.push({
      severity: 'WARN',
      category: 'REGULATORY',
      check: 'Specialist TUSS codes missing CBO requirement',
      details: 'Specialist consultations in Brazil should specify the minimum CBO (Classificação Brasileira de Ocupações) code per ANS guidelines.',
      affectedEntities: specialistNoCBO.map(c => `${c.code}: ${c.shortDescription}`),
    });
  }

  return findings;
}

async function checkRateAnomalies(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // Find fee schedule lines where negotiated rate is >200% or <30% of reference rate
  const lines = await prisma.feeScheduleLine.findMany({
    where: { feeSchedule: { isActive: true } },
    include: {
      procedureCode: {
        select: {
          code: true,
          country: true,
          referenceRateBRL: true,
          referenceRateARS: true,
          referenceRateBOB: true,
        },
      },
      feeSchedule: {
        select: { currency: true, insurer: { select: { shortName: true } } },
      },
    },
  });

  const anomalies: string[] = [];

  for (const line of lines) {
    const referenceRate =
      line.feeSchedule.currency === 'BRL' ? Number(line.procedureCode.referenceRateBRL ?? 0) :
      line.feeSchedule.currency === 'ARS' ? Number(line.procedureCode.referenceRateARS ?? 0) :
      Number(line.procedureCode.referenceRateBOB ?? 0);

    if (referenceRate <= 0) continue;

    const negotiated = Number(line.negotiatedRate);
    const ratio = negotiated / referenceRate;

    if (ratio > 2.0) {
      anomalies.push(
        `${line.procedureCode.code} @ ${line.feeSchedule.insurer.shortName}: ${negotiated} vs ref ${referenceRate} (${(ratio * 100).toFixed(0)}%)`
      );
    } else if (ratio < 0.3) {
      anomalies.push(
        `${line.procedureCode.code} @ ${line.feeSchedule.insurer.shortName}: ${negotiated} vs ref ${referenceRate} (${(ratio * 100).toFixed(0)}% — suspiciously low)`
      );
    }
  }

  if (anomalies.length > 0) {
    findings.push({
      severity: 'WARN',
      category: 'RATE_ANOMALY',
      check: 'Negotiated rates significantly deviate from reference rates',
      details: `${anomalies.length} fee schedule lines have negotiated rates >200% or <30% of the reference rate. This may indicate data entry errors or exceptional negotiations.`,
      affectedEntities: anomalies.slice(0, 20),
    });
  }

  return findings;
}

async function checkPriorAuthCoverage(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // High-cost procedures (actuarial weight > 0.6) without any prior auth rules
  const highCostNoAuth = await prisma.procedureCode.findMany({
    where: {
      isActive: true,
      actuarialWeight: { gte: 0.6 },
      priorAuthRules: { none: {} },
    },
    select: { code: true, system: true, country: true, shortDescription: true, actuarialWeight: true },
  });

  if (highCostNoAuth.length > 0) {
    findings.push({
      severity: 'WARN',
      category: 'PRIOR_AUTH',
      check: 'High-cost procedures without prior authorization rules',
      details: `${highCostNoAuth.length} procedures with actuarial weight >= 0.6 have no insurer-specific prior auth rules. This may result in unexpected claim denials.`,
      affectedEntities: highCostNoAuth.map(
        c => `${c.code} (${c.country}, weight: ${Number(c.actuarialWeight).toFixed(2)}): ${c.shortDescription}`
      ),
    });
  }

  // Insurers with no prior auth rules at all
  const insurersNoAuth = await prisma.insurer.findMany({
    where: { isActive: true, priorAuthRules: { none: {} } },
    select: { shortName: true, country: true },
  });

  if (insurersNoAuth.length > 0) {
    findings.push({
      severity: 'INFO',
      category: 'PRIOR_AUTH',
      check: 'Insurers without any prior auth rules',
      details: `${insurersNoAuth.length} active insurers have no prior authorization rules configured. Default behavior: no prior auth required.`,
      affectedEntities: insurersNoAuth.map(i => `${i.shortName} (${i.country})`),
    });
  }

  return findings;
}

async function checkDataFreshness(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // Fee schedules with effective dates older than 1 year
  const staleSchedules = await prisma.feeSchedule.findMany({
    where: { isActive: true, effectiveDate: { lt: oneYearAgo } },
    select: {
      version: true,
      effectiveDate: true,
      insurer: { select: { shortName: true, country: true } },
    },
  });

  if (staleSchedules.length > 0) {
    findings.push({
      severity: 'WARN',
      category: 'DATA_FRESHNESS',
      check: 'Fee schedules older than 1 year',
      details: `${staleSchedules.length} active fee schedules have effective dates >1 year ago. Consider running the annual migration script.`,
      affectedEntities: staleSchedules.map(
        s => `${s.insurer.shortName} (${s.insurer.country}): v${s.version}, effective ${s.effectiveDate.toISOString().split('T')[0]}`
      ),
    });
  }

  // Expired prior auth rules still referenced
  const expiredRules = await prisma.priorAuthRule.count({
    where: { expirationDate: { lt: now } },
  });

  if (expiredRules > 0) {
    findings.push({
      severity: 'WARN',
      category: 'DATA_FRESHNESS',
      check: 'Expired prior authorization rules',
      details: `${expiredRules} prior auth rules have passed their expiration date and should be reviewed or removed.`,
      affectedEntities: [],
    });
  }

  return findings;
}

async function checkInsurerFeeScheduleCoverage(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  // For each country, check that all insurers have schedules for the appropriate billing system
  const expectedSystems: Record<string, BillingSystem[]> = {
    BR: [BillingSystem.TUSS],
    AR: [BillingSystem.NOMENCLADOR],
    BO: [BillingSystem.CNS_BO],
  };

  for (const [country, systems] of Object.entries(expectedSystems)) {
    const insurers = await prisma.insurer.findMany({
      where: { country, isActive: true },
      select: {
        shortName: true,
        feeSchedules: {
          where: { isActive: true },
          select: { billingSystem: true },
        },
      },
    });

    for (const ins of insurers) {
      const coveredSystems = new Set(ins.feeSchedules.map(fs => fs.billingSystem));
      for (const expected of systems) {
        if (!coveredSystems.has(expected)) {
          findings.push({
            severity: 'WARN',
            category: 'RATE_COVERAGE',
            check: `Insurer missing expected billing system fee schedule`,
            details: `${ins.shortName} (${country}) has no active fee schedule for ${expected}.`,
            affectedEntities: [`${ins.shortName}: missing ${expected}`],
          });
        }
      }
    }
  }

  return findings;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function runAudit(): Promise<AuditReport> {
  const allFindings: AuditFinding[] = [];

  const checks = [
    { name: 'Rate coverage gaps', fn: checkRateCoverageGaps },
    { name: 'Crosswalk completeness', fn: checkCrosswalkCompleteness },
    { name: 'Regulatory fields', fn: checkRegulatoryFields },
    { name: 'Rate anomalies', fn: checkRateAnomalies },
    { name: 'Prior auth coverage', fn: checkPriorAuthCoverage },
    { name: 'Data freshness', fn: checkDataFreshness },
    { name: 'Insurer fee schedule coverage', fn: checkInsurerFeeScheduleCoverage },
  ];

  for (const check of checks) {
    console.log(`  Running: ${check.name}...`);
    const findings = await check.fn();
    allFindings.push(...findings);
  }

  return {
    timestamp: new Date().toISOString(),
    totalChecks: checks.length,
    findings: allFindings,
    summary: {
      errors: allFindings.filter(f => f.severity === 'ERROR').length,
      warnings: allFindings.filter(f => f.severity === 'WARN').length,
      infos: allFindings.filter(f => f.severity === 'INFO').length,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const countryFilter = args.find((_, i) => args[i - 1] === '--country') ?? null;
  const severityFilter = args.find((_, i) => args[i - 1] === '--severity') ?? null;
  const jsonOutput = args.includes('--json');

  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Holi Labs — Billing Compliance Audit');
  console.log(' Brazil (TUSS/ANS) · Argentina (Nomenclador) · Bolivia (CNS)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const report = await runAudit();

  // Apply filters
  let filtered = report.findings;
  if (countryFilter) {
    filtered = filtered.filter(f =>
      f.affectedEntities.some(e => e.includes(`(${countryFilter})`)) ||
      f.check.includes(`(${countryFilter})`)
    );
  }
  if (severityFilter) {
    filtered = filtered.filter(f => f.severity === severityFilter);
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ ...report, findings: filtered }, null, 2));
    return;
  }

  // Human-readable output
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Findings');
  console.log('═══════════════════════════════════════════════════════════\n');

  const severityIcon: Record<Severity, string> = {
    ERROR: 'ERROR',
    WARN: ' WARN',
    INFO: ' INFO',
  };

  for (const finding of filtered) {
    console.log(`[${severityIcon[finding.severity]}] ${finding.category}: ${finding.check}`);
    console.log(`        ${finding.details}`);
    if (finding.affectedEntities.length > 0) {
      console.log(`        Affected (${finding.affectedEntities.length}):`);
      for (const entity of finding.affectedEntities) {
        console.log(`          - ${entity}`);
      }
    }
    console.log();
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Checks run:   ${report.totalChecks}`);
  console.log(`  Errors:       ${report.summary.errors}`);
  console.log(`  Warnings:     ${report.summary.warnings}`);
  console.log(`  Infos:        ${report.summary.infos}`);
  console.log(`  Timestamp:    ${report.timestamp}`);

  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('\n Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
