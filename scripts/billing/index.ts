/**
 * Billing Intelligence — Seed Orchestrator
 *
 * Runs all billing seed scripts in dependency order:
 *   1. Procedure codes (no deps)
 *   2. Insurers (no deps)
 *   3. SNOMED crosswalk (requires procedure codes)
 *   4. Fee schedules (requires insurers + procedure codes)
 *   5. Prior auth rules (requires insurers + procedure codes)
 *   6. Validation (read-only integrity checks)
 *
 * Usage: cd apps/web && pnpm exec tsx ../../scripts/billing/index.ts
 */

import { PrismaClient } from '@prisma/client';
import { seedProcedureCodes } from './seed-procedure-codes';
import { seedInsurers } from './seed-insurers';
import { seedSnomedCrosswalk } from './seed-snomed-crosswalk';
import { seedFeeSchedules } from './seed-fee-schedules';
import { seedPriorAuthRules } from './seed-prior-auth-rules';
import { validateBillingData } from './validate-billing-data';

const prisma = new PrismaClient();

interface StepResult {
  step: string;
  duration: number;
  result: string;
}

async function run() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Holi Labs — 7-Country Billing Intelligence Seeder');
  console.log(' BR · AR · BO · US · CA · CO · MX');
  console.log('═══════════════════════════════════════════════════════════\n');

  const steps: StepResult[] = [];
  const startTotal = Date.now();

  // Step 1: Procedure codes
  {
    const start = Date.now();
    console.log('Step 1/6 — Procedure Codes');
    const count = await seedProcedureCodes();
    steps.push({ step: 'Procedure Codes', duration: Date.now() - start, result: `${count} upserted` });
  }

  // Step 2: Insurers
  {
    const start = Date.now();
    console.log('\nStep 2/6 — Insurers');
    const count = await seedInsurers();
    steps.push({ step: 'Insurers', duration: Date.now() - start, result: `${count} upserted` });
  }

  // Step 3: SNOMED crosswalk (depends on step 1)
  {
    const start = Date.now();
    console.log('\nStep 3/6 — SNOMED Crosswalk');
    const { seeded, skipped } = await seedSnomedCrosswalk();
    steps.push({
      step: 'SNOMED Crosswalk',
      duration: Date.now() - start,
      result: `${seeded} seeded${skipped > 0 ? `, ${skipped} skipped` : ''}`,
    });
  }

  // Step 4: Fee schedules (depends on steps 1 + 2)
  {
    const start = Date.now();
    console.log('\nStep 4/6 — Fee Schedules');
    const { schedules, lines } = await seedFeeSchedules();
    steps.push({
      step: 'Fee Schedules',
      duration: Date.now() - start,
      result: `${schedules} schedules, ${lines} lines`,
    });
  }

  // Step 5: Prior auth rules (depends on steps 1 + 2)
  {
    const start = Date.now();
    console.log('\nStep 5/6 — Prior Auth Rules');
    const count = await seedPriorAuthRules();
    steps.push({ step: 'Prior Auth Rules', duration: Date.now() - start, result: `${count} upserted` });
  }

  // Step 6: Validation
  {
    const start = Date.now();
    console.log('\nStep 6/6 — Validation\n');
    const results = await validateBillingData();
    const failed = results.filter(r => !r.passed);
    steps.push({
      step: 'Validation',
      duration: Date.now() - start,
      result: failed.length === 0 ? 'All checks passed' : `${failed.length} check(s) FAILED`,
    });

    if (failed.length > 0) {
      console.error('\n❌ VALIDATION FAILURES:');
      for (const f of failed) {
        console.error(`  • ${f.check}: ${f.details}`);
      }
    }
  }

  // Summary table
  const totalDuration = Date.now() - startTotal;
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Summary');
  console.log('═══════════════════════════════════════════════════════════');
  for (const s of steps) {
    const icon = s.result.includes('FAILED') ? '❌' : '✅';
    console.log(`${icon}  ${s.step.padEnd(22)} ${s.result.padEnd(40)} ${s.duration}ms`);
  }
  console.log(`\n   Total time: ${totalDuration}ms`);

  const hasFailed = steps.some(s => s.result.includes('FAILED'));
  if (hasFailed) {
    process.exit(1);
  }
}

run()
  .catch((e) => {
    console.error('\n💥 Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
