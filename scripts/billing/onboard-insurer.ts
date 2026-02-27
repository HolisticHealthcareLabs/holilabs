/**
 * Billing Intelligence — Insurer Onboarding Script
 *
 * Programmatic onboarding of a new insurer with fee schedule creation,
 * prior auth rule setup, and validation. Used for both initial setup
 * and adding new payers to the system.
 *
 * Steps:
 *   1. Create Insurer record with country-specific identifiers
 *   2. Create FeeSchedule header with appropriate billing system/currency
 *   3. Clone fee schedule lines from reference rates (or a template insurer)
 *   4. Apply rate adjustment factor (negotiated discount/premium)
 *   5. Optionally copy prior auth rules from a template insurer
 *   6. Validate the complete setup
 *
 * Usage:
 *   cd apps/web && pnpm exec tsx ../../scripts/billing/onboard-insurer.ts \
 *     --config ../../data/onboarding/new-insurer.json
 *
 * Config file format: see OnboardingConfig interface below.
 */

import { PrismaClient, BillingSystem, BillingCurrency } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OnboardingConfig {
  /** Insurer identity */
  insurer: {
    name: string;
    shortName: string;
    country: 'BR' | 'AR' | 'BO';
    insurerType: string;
    ansCode?: string;
    cnpj?: string;
    cuitCode?: string;
    rnos?: string;
    cnsCode?: string;
    tissTissVersion?: string;
    estimatedMembers?: number;
    coverageRegions: string[];
    productLines: string[];
  };

  /** Fee schedule configuration */
  feeSchedule: {
    billingSystem: string;
    version: string;
    effectiveDate: string;
    /** Rate adjustment vs reference rates: 0.0 = use reference, -0.1 = 10% discount, +0.15 = 15% premium */
    rateAdjustment: number;
    /** Optional: clone rates from an existing insurer (by ansCode/rnos/cnsCode) */
    templateInsurer?: string;
    /** Procedure categories to include (empty = all) */
    includeCategories?: string[];
    /** Procedure categories to exclude */
    excludeCategories?: string[];
  };

  /** Prior auth rule configuration */
  priorAuth: {
    /** Clone rules from a template insurer */
    templateInsurer?: string;
    /** Or specify rules directly */
    rules?: Array<{
      procedureCode: string;
      required: boolean;
      windowDays?: number;
      urgentWindowHours?: number;
      requiredDocuments: string[];
      requiredDiagnoses: string[];
      notes?: string;
    }>;
  };
}

function loadConfig(configPath: string): OnboardingConfig {
  const absPath = path.resolve(configPath);
  if (!fs.existsSync(absPath)) {
    console.error(`Config file not found: ${absPath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

async function onboard(config: OnboardingConfig) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(` Onboarding: ${config.insurer.name}`);
  console.log(` Country: ${config.insurer.country} | Type: ${config.insurer.insurerType}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Step 1: Create insurer ──────────────────────────────────────────────

  console.log('Step 1/4 — Creating insurer record...');

  const ins = config.insurer;
  const insurer = await prisma.insurer.create({
    data: {
      name: ins.name,
      shortName: ins.shortName,
      country: ins.country,
      insurerType: ins.insurerType,
      ansCode: ins.ansCode ?? null,
      cnpj: ins.cnpj ?? null,
      cuitCode: ins.cuitCode ?? null,
      rnos: ins.rnos ?? null,
      cnsCode: ins.cnsCode ?? null,
      tissTissVersion: ins.tissTissVersion ?? null,
      estimatedMembers: ins.estimatedMembers ?? null,
      coverageRegions: ins.coverageRegions,
      productLines: ins.productLines,
      isActive: true,
      effectiveDate: new Date(),
    },
  });

  console.log(`  Insurer created: ${insurer.id}`);

  // ── Step 2: Create fee schedule ─────────────────────────────────────────

  console.log('\nStep 2/4 — Creating fee schedule...');

  const fsCfg = config.feeSchedule;
  const currency: BillingCurrency =
    ins.country === 'BR' ? 'BRL' : ins.country === 'AR' ? 'ARS' : 'BOB';

  const feeSchedule = await prisma.feeSchedule.create({
    data: {
      insurerId: insurer.id,
      billingSystem: fsCfg.billingSystem as BillingSystem,
      currency,
      effectiveDate: new Date(fsCfg.effectiveDate),
      version: fsCfg.version,
      isActive: true,
    },
  });

  console.log(`  Fee schedule created: ${feeSchedule.id}`);

  // ── Step 3: Populate fee schedule lines ─────────────────────────────────

  console.log('\nStep 3/4 — Populating fee schedule lines...');

  let lineCount = 0;

  if (fsCfg.templateInsurer) {
    // Clone from template insurer
    const template = await prisma.insurer.findFirst({
      where: {
        OR: [
          { ansCode: fsCfg.templateInsurer },
          { rnos: fsCfg.templateInsurer },
          { cnsCode: fsCfg.templateInsurer },
        ],
      },
    });

    if (!template) {
      console.error(`  Template insurer not found: ${fsCfg.templateInsurer}`);
    } else {
      const templateSchedule = await prisma.feeSchedule.findFirst({
        where: {
          insurerId: template.id,
          billingSystem: fsCfg.billingSystem as BillingSystem,
          isActive: true,
        },
        include: { lines: true },
      });

      if (templateSchedule) {
        for (const line of templateSchedule.lines) {
          const adjustedRate = Number(line.negotiatedRate) * (1 + fsCfg.rateAdjustment);

          await prisma.feeScheduleLine.create({
            data: {
              feeScheduleId: feeSchedule.id,
              procedureCodeId: line.procedureCodeId,
              negotiatedRate: Math.round(adjustedRate * 100) / 100,
              currency,
              confidence: 'ESTIMATED',
              isCovered: line.isCovered,
              coverageLimit: line.coverageLimit,
              copayFlat: line.copayFlat,
              copayPercent: line.copayPercent,
              effectiveDate: new Date(fsCfg.effectiveDate),
            },
          });
          lineCount++;
        }
        console.log(`  Cloned ${lineCount} lines from ${template.shortName} (adj: ${fsCfg.rateAdjustment > 0 ? '+' : ''}${(fsCfg.rateAdjustment * 100).toFixed(1)}%)`);
      }
    }
  } else {
    // Generate from reference rates
    const where: Record<string, unknown> = {
      country: ins.country,
      system: fsCfg.billingSystem as BillingSystem,
      isActive: true,
    };

    if (fsCfg.includeCategories?.length) {
      where.category = { in: fsCfg.includeCategories };
    }
    if (fsCfg.excludeCategories?.length) {
      where.category = { ...((where.category as object) ?? {}), notIn: fsCfg.excludeCategories };
    }

    const procedureCodes = await prisma.procedureCode.findMany({ where });

    const rateField =
      ins.country === 'BR' ? 'referenceRateBRL' :
      ins.country === 'AR' ? 'referenceRateARS' :
      'referenceRateBOB';

    for (const pc of procedureCodes) {
      const referenceRate = Number(pc[rateField as keyof typeof pc] ?? 0);
      if (referenceRate <= 0) continue;

      const adjustedRate = referenceRate * (1 + fsCfg.rateAdjustment);

      await prisma.feeScheduleLine.create({
        data: {
          feeScheduleId: feeSchedule.id,
          procedureCodeId: pc.id,
          negotiatedRate: Math.round(adjustedRate * 100) / 100,
          currency,
          confidence: 'ESTIMATED',
          isCovered: true,
          effectiveDate: new Date(fsCfg.effectiveDate),
        },
      });
      lineCount++;
    }

    console.log(`  Created ${lineCount} lines from reference rates (adj: ${fsCfg.rateAdjustment > 0 ? '+' : ''}${(fsCfg.rateAdjustment * 100).toFixed(1)}%)`);
  }

  // ── Step 4: Prior auth rules ────────────────────────────────────────────

  console.log('\nStep 4/4 — Setting up prior auth rules...');

  let ruleCount = 0;
  const authCfg = config.priorAuth;

  if (authCfg.templateInsurer) {
    const template = await prisma.insurer.findFirst({
      where: {
        OR: [
          { ansCode: authCfg.templateInsurer },
          { rnos: authCfg.templateInsurer },
          { cnsCode: authCfg.templateInsurer },
        ],
      },
    });

    if (template) {
      const templateRules = await prisma.priorAuthRule.findMany({
        where: { insurerId: template.id },
      });

      for (const rule of templateRules) {
        await prisma.priorAuthRule.create({
          data: {
            insurerId: insurer.id,
            procedureCodeId: rule.procedureCodeId,
            required: rule.required,
            windowDays: rule.windowDays,
            urgentWindowHours: rule.urgentWindowHours,
            requiredDocuments: rule.requiredDocuments,
            requiredDiagnoses: rule.requiredDiagnoses,
            notes: rule.notes,
            effectiveDate: new Date(fsCfg.effectiveDate),
          },
        });
        ruleCount++;
      }
      console.log(`  Cloned ${ruleCount} rules from ${template.shortName}`);
    }
  }

  if (authCfg.rules?.length) {
    for (const rule of authCfg.rules) {
      const pc = await prisma.procedureCode.findFirst({
        where: { code: rule.procedureCode, isActive: true },
      });
      if (!pc) {
        console.warn(`  Procedure code not found: ${rule.procedureCode} — skipping rule`);
        continue;
      }

      await prisma.priorAuthRule.create({
        data: {
          insurerId: insurer.id,
          procedureCodeId: pc.id,
          required: rule.required,
          windowDays: rule.windowDays ?? null,
          urgentWindowHours: rule.urgentWindowHours ?? null,
          requiredDocuments: rule.requiredDocuments,
          requiredDiagnoses: rule.requiredDiagnoses,
          notes: rule.notes ?? null,
          effectiveDate: new Date(fsCfg.effectiveDate),
        },
      });
      ruleCount++;
    }
    console.log(`  Created ${authCfg.rules.length} explicit rules`);
  }

  if (ruleCount === 0) {
    console.log('  No prior auth rules configured (default: no pre-auth required)');
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' Onboarding Complete');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Insurer:          ${insurer.shortName} (${insurer.id})`);
  console.log(`  Fee schedule:     ${feeSchedule.id} (${lineCount} lines)`);
  console.log(`  Prior auth rules: ${ruleCount}`);
  console.log(`  Country:          ${ins.country}`);
  console.log(`  Billing system:   ${fsCfg.billingSystem}`);
  console.log(`  Currency:         ${currency}`);
}

async function main() {
  const configPath = process.argv.find((_, i) => process.argv[i - 1] === '--config');

  if (!configPath) {
    console.log('Usage: onboard-insurer.ts --config <path-to-config.json>');
    console.log('\nExample config:');
    const example: OnboardingConfig = {
      insurer: {
        name: 'Seguros Pacífico S.A.',
        shortName: 'Pacífico',
        country: 'BO',
        insurerType: 'PRIVATE_COMMERCIAL',
        cnsCode: 'PAC-001',
        estimatedMembers: 15000,
        coverageRegions: ['LP', 'CB', 'SC'],
        productLines: ['INDIVIDUAL', 'CORPORATE'],
      },
      feeSchedule: {
        billingSystem: 'CNS_BO',
        version: '2024.1',
        effectiveDate: '2024-01-01',
        rateAdjustment: 0.10,
      },
      priorAuth: {
        templateInsurer: 'CNS-001',
      },
    };
    console.log(JSON.stringify(example, null, 2));
    process.exit(0);
  }

  const config = loadConfig(configPath);
  await onboard(config);
}

main()
  .catch((e) => {
    console.error('\n Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
