/**
 * Billing Intelligence — Data Validation
 *
 * Read-only integrity checks after seeding. Exits non-zero if any check fails.
 * Run as the final step in the billing seed pipeline.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ValidationResult {
  check: string;
  passed: boolean;
  details: string;
}

const CORE_SNOMED_CONCEPTS = [
  { id: '11429006', description: 'Consultation' },
  { id: '26604007', description: 'Complete blood count' },
  { id: '406547006', description: 'Office visit' },
  { id: '29303009', description: 'Electrocardiogram' },
  { id: '86198006', description: 'Influenza vaccination' },
];

const COUNTRIES = ['BR', 'AR', 'BO'];

export async function validateBillingData(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // 1. Every active insurer has ≥1 FeeSchedule
  const insurersWithoutSchedule = await prisma.insurer.findMany({
    where: { isActive: true, feeSchedules: { none: {} } },
    select: { id: true, shortName: true, country: true },
  });
  results.push({
    check: 'Every active insurer has ≥1 FeeSchedule',
    passed: insurersWithoutSchedule.length === 0,
    details: insurersWithoutSchedule.length === 0
      ? 'All active insurers have at least one fee schedule'
      : `Insurers missing fee schedule: ${insurersWithoutSchedule.map(i => `${i.shortName} (${i.country})`).join(', ')}`,
  });

  // 2. All FeeScheduleLines reference isActive=true ProcedureCodes
  const linesWithInactiveCode = await prisma.feeScheduleLine.count({
    where: { procedureCode: { isActive: false } },
  });
  results.push({
    check: 'All FeeScheduleLines reference active ProcedureCodes',
    passed: linesWithInactiveCode === 0,
    details: linesWithInactiveCode === 0
      ? 'All fee schedule lines reference active procedure codes'
      : `${linesWithInactiveCode} fee schedule lines reference inactive procedure codes`,
  });

  // 3. All PriorAuthRules reference valid Insurer + ProcedureCode
  const orphanedAuthRules = await prisma.priorAuthRule.count({
    where: {
      OR: [
        { insurer: { isActive: false } },
        { procedureCode: { isActive: false } },
      ],
    },
  });
  results.push({
    check: 'All PriorAuthRules reference valid Insurer + ProcedureCode',
    passed: orphanedAuthRules === 0,
    details: orphanedAuthRules === 0
      ? 'All prior auth rules reference valid entities'
      : `${orphanedAuthRules} prior auth rules have invalid references`,
  });

  // 4. All SnomedCrosswalk entries reference isActive=true ProcedureCodes
  const orphanedCrosswalks = await prisma.snomedCrosswalk.count({
    where: { procedureCode: { isActive: false } },
  });
  results.push({
    check: 'All SnomedCrosswalks reference active ProcedureCodes',
    passed: orphanedCrosswalks === 0,
    details: orphanedCrosswalks === 0
      ? 'All SNOMED crosswalks reference active procedure codes'
      : `${orphanedCrosswalks} crosswalks reference inactive procedure codes`,
  });

  // 5. Core SNOMED concepts have crosswalks for all 3 countries
  for (const concept of CORE_SNOMED_CONCEPTS) {
    const crosswalks = await prisma.snomedCrosswalk.findMany({
      where: { snomedConceptId: concept.id },
      select: { country: true },
    });
    const coveredCountries = crosswalks.map(c => c.country);
    const missingCountries = COUNTRIES.filter(c => !coveredCountries.includes(c));
    results.push({
      check: `Core SNOMED ${concept.id} (${concept.description}) has crosswalks for all 3 countries`,
      passed: missingCountries.length === 0,
      details: missingCountries.length === 0
        ? `Covered: ${COUNTRIES.join(', ')}`
        : `Missing crosswalks for: ${missingCountries.join(', ')}`,
    });
  }

  // 6. No duplicate active FeeSchedule per insurer × billingSystem
  const duplicateSchedules = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM (
      SELECT "insurerId", "billingSystem", COUNT(*) as cnt
      FROM "fee_schedules"
      WHERE "isActive" = true
      GROUP BY "insurerId", "billingSystem"
      HAVING COUNT(*) > 1
    ) dupes
  `;
  const dupCount = Number(duplicateSchedules[0]?.count ?? 0);
  results.push({
    check: 'No duplicate active FeeSchedule per insurer × billingSystem',
    passed: dupCount === 0,
    details: dupCount === 0
      ? 'No duplicates found'
      : `${dupCount} insurer × billingSystem pairs have multiple active fee schedules`,
  });

  // 7. Row count summary
  const [procedureCodes, insurers, crosswalks, schedules, authRules] = await Promise.all([
    prisma.procedureCode.count({ where: { isActive: true } }),
    prisma.insurer.count({ where: { isActive: true } }),
    prisma.snomedCrosswalk.count(),
    prisma.feeSchedule.count({ where: { isActive: true } }),
    prisma.priorAuthRule.count(),
  ]);

  results.push({
    check: 'Row count summary',
    passed: procedureCodes >= 200 && insurers >= 18 && crosswalks >= 50,
    details: `ProcedureCodes=${procedureCodes}, Insurers=${insurers}, SnomedCrosswalks=${crosswalks}, FeeSchedules=${schedules}, PriorAuthRules=${authRules}`,
  });

  return results;
}

async function main() {
  console.log('🔍 Validating billing data...\n');
  try {
    const results = await validateBillingData();

    let allPassed = true;
    for (const r of results) {
      const icon = r.passed ? '✅' : '❌';
      console.log(`${icon} ${r.check}`);
      console.log(`   ${r.details}\n`);
      if (!r.passed) allPassed = false;
    }

    if (!allPassed) {
      console.error('❌ Validation failed — some checks did not pass');
      process.exit(1);
    } else {
      console.log('✅ All validation checks passed');
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
