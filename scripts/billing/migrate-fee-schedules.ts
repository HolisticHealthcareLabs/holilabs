/**
 * Billing Intelligence — Annual Fee Schedule Migration
 *
 * Clones fee schedules from one version year to another, enabling the
 * January annual update cycle for all three countries.
 *
 * Flow:
 *   1. Find all active FeeSchedules for the source version
 *   2. Create new FeeSchedule headers with the target version/date
 *   3. Clone all FeeScheduleLines (optionally applying a rate adjustment %)
 *   4. Mark source-version FeeSchedules as inactive (if --deactivate-old)
 *   5. Mark deprecated ProcedureCodes as inactive (reads deprecation list from stdin or file)
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/billing/migrate-fee-schedules.ts \
 *     --from 2024.1 --to 2025.1 \
 *     [--rate-adjustment 0.05] \
 *     [--deactivate-old] \
 *     [--deprecation-file ../../data/master/deprecations-2025.json] \
 *     [--dry-run]
 */

import { PrismaClient, BillingCurrency, BillingSystem, RateConfidence } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationOptions {
  fromVersion: string;
  toVersion: string;
  rateAdjustment: number; // 0.05 = 5% increase
  deactivateOld: boolean;
  deprecationFile: string | null;
  dryRun: boolean;
}

interface DeprecationEntry {
  code: string;
  system: string;
  replacedBy?: string;
  reason: string;
}

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2);
  const opts: MigrationOptions = {
    fromVersion: '',
    toVersion: '',
    rateAdjustment: 0,
    deactivateOld: false,
    deprecationFile: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        opts.fromVersion = args[++i];
        break;
      case '--to':
        opts.toVersion = args[++i];
        break;
      case '--rate-adjustment':
        opts.rateAdjustment = parseFloat(args[++i]);
        break;
      case '--deactivate-old':
        opts.deactivateOld = true;
        break;
      case '--deprecation-file':
        opts.deprecationFile = args[++i];
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
    }
  }

  if (!opts.fromVersion || !opts.toVersion) {
    console.error('Usage: migrate-fee-schedules.ts --from <version> --to <version> [options]');
    console.error('  --rate-adjustment <decimal>  Rate increase factor (e.g., 0.05 for 5%)');
    console.error('  --deactivate-old             Mark source version schedules as inactive');
    console.error('  --deprecation-file <path>    JSON file listing deprecated procedure codes');
    console.error('  --dry-run                    Preview without writing to DB');
    process.exit(1);
  }

  return opts;
}

function applyAdjustment(rate: number, adjustment: number): number {
  return Math.round(rate * (1 + adjustment) * 100) / 100;
}

async function migrate(opts: MigrationOptions) {
  const prefix = opts.dryRun ? '[DRY RUN] ' : '';

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`${prefix}Fee Schedule Migration: ${opts.fromVersion} → ${opts.toVersion}`);
  if (opts.rateAdjustment !== 0) {
    console.log(`  Rate adjustment: ${opts.rateAdjustment > 0 ? '+' : ''}${(opts.rateAdjustment * 100).toFixed(1)}%`);
  }
  console.log('═══════════════════════════════════════════════════════════\n');

  // Step 1: Find source fee schedules
  const sourceSchedules = await prisma.feeSchedule.findMany({
    where: { version: opts.fromVersion, isActive: true },
    include: {
      insurer: { select: { id: true, shortName: true, country: true } },
      lines: {
        include: {
          procedureCode: {
            select: { id: true, code: true, system: true, isActive: true },
          },
        },
      },
    },
  });

  if (sourceSchedules.length === 0) {
    console.error(`No active fee schedules found for version ${opts.fromVersion}`);
    process.exit(1);
  }

  console.log(`Found ${sourceSchedules.length} fee schedules to migrate:\n`);

  let totalSchedules = 0;
  let totalLines = 0;
  let skippedLines = 0;

  for (const source of sourceSchedules) {
    const insurer = source.insurer;
    console.log(`  ${insurer.shortName} (${insurer.country}) — ${source.billingSystem}`);
    console.log(`    Source: ${source.lines.length} lines, version ${opts.fromVersion}`);

    // Compute new effective date (January 1 of the target year)
    const targetYear = opts.toVersion.split('.')[0];
    const newEffectiveDate = new Date(`${targetYear}-01-01T00:00:00Z`);

    if (opts.dryRun) {
      console.log(`    ${prefix}Would create schedule with ${source.lines.length} lines`);
      totalSchedules++;
      totalLines += source.lines.length;
      continue;
    }

    // Step 2: Check if target schedule already exists
    const existing = await prisma.feeSchedule.findFirst({
      where: {
        insurerId: insurer.id,
        billingSystem: source.billingSystem,
        version: opts.toVersion,
      },
    });

    if (existing) {
      console.log(`    ⚠ Target schedule already exists (id: ${existing.id}) — skipping`);
      continue;
    }

    // Step 3: Create new FeeSchedule header
    const newSchedule = await prisma.feeSchedule.create({
      data: {
        insurerId: insurer.id,
        billingSystem: source.billingSystem,
        currency: source.currency,
        effectiveDate: newEffectiveDate,
        version: opts.toVersion,
        isActive: true,
      },
    });

    totalSchedules++;

    // Step 4: Clone lines with optional rate adjustment
    for (const line of source.lines) {
      if (!line.procedureCode.isActive) {
        skippedLines++;
        continue;
      }

      const adjustedRate = applyAdjustment(
        Number(line.negotiatedRate),
        opts.rateAdjustment
      );

      await prisma.feeScheduleLine.create({
        data: {
          feeScheduleId: newSchedule.id,
          procedureCodeId: line.procedureCodeId,
          negotiatedRate: adjustedRate,
          currency: line.currency,
          confidence: line.confidence,
          isCovered: line.isCovered,
          coverageLimit: line.coverageLimit,
          copayFlat: line.copayFlat,
          copayPercent: line.copayPercent,
          effectiveDate: newEffectiveDate,
        },
      });
      totalLines++;
    }

    console.log(`    ✓ Created schedule with ${source.lines.length - skippedLines} lines`);
  }

  // Step 5: Deactivate old schedules
  if (opts.deactivateOld && !opts.dryRun) {
    const deactivated = await prisma.feeSchedule.updateMany({
      where: { version: opts.fromVersion, isActive: true },
      data: { isActive: false },
    });
    console.log(`\n  Deactivated ${deactivated.count} source-version fee schedules`);
  }

  // Step 6: Handle deprecated procedure codes
  if (opts.deprecationFile) {
    const fs = await import('fs');
    const path = await import('path');
    const absPath = path.resolve(opts.deprecationFile);
    const deprecations: DeprecationEntry[] = JSON.parse(
      fs.readFileSync(absPath, 'utf-8')
    );

    console.log(`\n  Processing ${deprecations.length} deprecations from ${opts.deprecationFile}:`);

    for (const dep of deprecations) {
      if (opts.dryRun) {
        console.log(`    ${prefix}Would deprecate ${dep.code} (${dep.system}): ${dep.reason}`);
        continue;
      }

      const updated = await prisma.procedureCode.updateMany({
        where: {
          code: dep.code,
          system: dep.system as BillingSystem,
          isActive: true,
        },
        data: {
          isActive: false,
          terminationDate: new Date(),
          deprecatedBy: dep.replacedBy ?? null,
        },
      });

      if (updated.count > 0) {
        console.log(`    ✓ Deprecated ${dep.code} → ${dep.replacedBy ?? 'no replacement'}`);
      } else {
        console.log(`    ⚠ Code ${dep.code} not found or already inactive`);
      }
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`${prefix}Migration Summary`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Schedules migrated: ${totalSchedules}`);
  console.log(`  Lines cloned:       ${totalLines}`);
  console.log(`  Lines skipped:      ${skippedLines} (inactive procedure codes)`);
  if (opts.rateAdjustment !== 0) {
    console.log(`  Rate adjustment:    ${opts.rateAdjustment > 0 ? '+' : ''}${(opts.rateAdjustment * 100).toFixed(1)}%`);
  }
}

migrate(parseArgs())
  .catch((e) => {
    console.error('\n Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
