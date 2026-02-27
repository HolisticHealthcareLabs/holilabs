/**
 * Billing Intelligence — Fee Schedule Seeder
 *
 * Seeds FeeSchedule + FeeScheduleLine tables for each insurer.
 * MUST run AFTER seed-procedure-codes and seed-insurers.
 *
 * Unique key for FeeSchedule: (insurerId, billingSystem, effectiveDate)
 * Unique key for FeeScheduleLine: (feeScheduleId, procedureCodeId)
 */

import { PrismaClient, BillingSystem, BillingCurrency, RateConfidence } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface FeeScheduleLineInput {
  code: string;
  negotiatedRate: number;
  confidence: string;
  isCovered: boolean;
  coverageLimit?: number;
  copayFlat?: number;
  copayPercent?: number;
}

interface FeeScheduleInput {
  insurerAnsCode?: string;
  insurerRnos?: string;
  insurerCnsCode?: string;
  billingSystem: string;
  effectiveDate: string;
  lines: FeeScheduleLineInput[];
}

interface FeeScheduleFile {
  meta: { currency: string };
  schedules: FeeScheduleInput[];
}

function loadJson(relativePath: string): FeeScheduleFile {
  const absPath = path.resolve(__dirname, '../../data/master', relativePath);
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

export async function seedFeeSchedules(): Promise<{ schedules: number; lines: number }> {
  const files = [
    { path: 'fee-schedules/brazil-reference-2024.json', version: '2024.1' },
    { path: 'fee-schedules/bolivia-cns-tariff-2024.json', version: '2024.1' },
    { path: 'fee-schedules/argentina-nomenclador-2024.json', version: '2024.1' },
  ];

  let totalSchedules = 0;
  let totalLines = 0;

  for (const fileInfo of files) {
    const data = loadJson(fileInfo.path);
    const currency = data.meta.currency as BillingCurrency;

    for (const schedule of data.schedules) {
      // Resolve insurer by identifier
      let insurer = null;
      if (schedule.insurerAnsCode) {
        insurer = await prisma.insurer.findUnique({ where: { ansCode: schedule.insurerAnsCode } });
      } else if (schedule.insurerRnos) {
        insurer = await prisma.insurer.findUnique({ where: { rnos: schedule.insurerRnos } });
      } else if (schedule.insurerCnsCode) {
        insurer = await prisma.insurer.findUnique({ where: { cnsCode: schedule.insurerCnsCode } });
      }

      if (!insurer) {
        console.warn(`  ⚠ Insurer not found for schedule in ${fileInfo.path}`);
        continue;
      }

      const effectiveDate = new Date(schedule.effectiveDate);

      // Upsert FeeSchedule header
      const feeSchedule = await prisma.feeSchedule.upsert({
        where: {
          insurerId_billingSystem_effectiveDate: {
            insurerId: insurer.id,
            billingSystem: schedule.billingSystem as BillingSystem,
            effectiveDate,
          },
        },
        update: { isActive: true, version: fileInfo.version },
        create: {
          insurerId: insurer.id,
          billingSystem: schedule.billingSystem as BillingSystem,
          currency,
          effectiveDate,
          version: fileInfo.version,
          isActive: true,
        },
      });

      totalSchedules++;

      // Seed lines
      for (const line of schedule.lines) {
        const procedureCode = await prisma.procedureCode.findFirst({
          where: { code: line.code, isActive: true },
        });

        if (!procedureCode) {
          console.warn(`    ⚠ ProcedureCode not found: ${line.code}`);
          continue;
        }

        await prisma.feeScheduleLine.upsert({
          where: {
            feeScheduleId_procedureCodeId: {
              feeScheduleId: feeSchedule.id,
              procedureCodeId: procedureCode.id,
            },
          },
          update: {
            negotiatedRate: line.negotiatedRate,
            confidence: line.confidence as RateConfidence,
            isCovered: line.isCovered,
            coverageLimit: line.coverageLimit ?? null,
            copayFlat: line.copayFlat ?? null,
            copayPercent: line.copayPercent ?? null,
          },
          create: {
            feeScheduleId: feeSchedule.id,
            procedureCodeId: procedureCode.id,
            negotiatedRate: line.negotiatedRate,
            currency,
            confidence: line.confidence as RateConfidence,
            isCovered: line.isCovered,
            coverageLimit: line.coverageLimit ?? null,
            copayFlat: line.copayFlat ?? null,
            copayPercent: line.copayPercent ?? null,
            effectiveDate,
          },
        });
        totalLines++;
      }
    }
    console.log(`  ✓ ${fileInfo.path} — done`);
  }

  // ── Second pass: auto-generate ESTIMATED schedules for insurers without one ──
  const countryConfig: Record<string, { system: BillingSystem; currency: BillingCurrency; rateField: string }> = {
    BR: { system: 'TUSS' as BillingSystem, currency: 'BRL' as BillingCurrency, rateField: 'referenceRateBRL' },
    AR: { system: 'NOMENCLADOR' as BillingSystem, currency: 'ARS' as BillingCurrency, rateField: 'referenceRateARS' },
    BO: { system: 'CNS_BO' as BillingSystem, currency: 'BOB' as BillingCurrency, rateField: 'referenceRateBOB' },
  };

  const uncoveredInsurers = await prisma.insurer.findMany({
    where: { isActive: true, feeSchedules: { none: {} } },
    select: { id: true, shortName: true, country: true },
  });

  for (const ins of uncoveredInsurers) {
    const cfg = countryConfig[ins.country];
    if (!cfg) continue;

    const effectiveDate = new Date('2024-01-01');

    const feeSchedule = await prisma.feeSchedule.upsert({
      where: {
        insurerId_billingSystem_effectiveDate: {
          insurerId: ins.id,
          billingSystem: cfg.system,
          effectiveDate,
        },
      },
      update: { isActive: true, version: '2024.1' },
      create: {
        insurerId: ins.id,
        billingSystem: cfg.system,
        currency: cfg.currency,
        effectiveDate,
        version: '2024.1',
        isActive: true,
      },
    });

    // Generate lines from reference rates for this country's procedures
    const procedures = await prisma.procedureCode.findMany({
      where: { country: ins.country, isActive: true },
    });

    let linesCreated = 0;
    for (const pc of procedures) {
      const rate = Number(pc[cfg.rateField as keyof typeof pc] ?? 0);
      if (rate <= 0) continue;

      await prisma.feeScheduleLine.upsert({
        where: {
          feeScheduleId_procedureCodeId: {
            feeScheduleId: feeSchedule.id,
            procedureCodeId: pc.id,
          },
        },
        update: { negotiatedRate: rate, confidence: 'ESTIMATED' as RateConfidence },
        create: {
          feeScheduleId: feeSchedule.id,
          procedureCodeId: pc.id,
          negotiatedRate: rate,
          currency: cfg.currency,
          confidence: 'ESTIMATED' as RateConfidence,
          isCovered: true,
          effectiveDate,
        },
      });
      linesCreated++;
    }
    totalSchedules++;
    totalLines += linesCreated;
  }

  if (uncoveredInsurers.length > 0) {
    console.log(`  ✓ Auto-generated ESTIMATED schedules for ${uncoveredInsurers.length} remaining insurers`);
  }

  return { schedules: totalSchedules, lines: totalLines };
}

async function main() {
  console.log('💰 Seeding fee schedules...');
  try {
    const result = await seedFeeSchedules();
    console.log(`✅ Fee schedules done — ${result.schedules} schedules, ${result.lines} lines`);
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
