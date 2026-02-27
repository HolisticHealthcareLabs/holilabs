/**
 * Billing Intelligence — Procedure Code Seeder
 *
 * Loads procedure codes for Brazil (TUSS expanded), Argentina (Nomenclador),
 * and Bolivia (CNS_BO / SAFCI_BO) into the ProcedureCode table.
 *
 * Uses upsert with deterministic unique key: (code, system, version)
 * Safe to re-run — idempotent.
 *
 * Run: cd apps/web && pnpm exec tsx ../../scripts/billing/seed-procedure-codes.ts
 */

import { PrismaClient, BillingSystem } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface ProcedureCodeInput {
  code: string;
  system: string;
  version: string;
  country: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  referenceRateBRL?: number | null;
  referenceRateARS?: number | null;
  referenceRateBOB?: number | null;
  actuarialWeight: number;
  applicableSeverities: string[];
  requiresAnesthesia: boolean;
  requiresHospitalization: boolean;
  typicalDurationMinutes?: number | null;
  requiresCBO?: string | null;
  effectiveDate: string;
}

function loadJson(relativePath: string): { codes: ProcedureCodeInput[] } {
  const absPath = path.resolve(__dirname, '../../data/master', relativePath);
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

export async function seedProcedureCodes(): Promise<number> {
  const files = [
    'procedure-codes/tuss-expanded.json',
    'procedure-codes/nomenclador-argentina.json',
    'procedure-codes/cns-bolivia.json',
  ];

  let total = 0;

  for (const file of files) {
    const data = loadJson(file);
    for (const c of data.codes) {
      await prisma.procedureCode.upsert({
        where: {
          code_system_version: {
            code: c.code,
            system: c.system as BillingSystem,
            version: c.version,
          },
        },
        update: {
          shortDescription: c.shortDescription,
          fullDescription: c.fullDescription,
          category: c.category,
          referenceRateBRL: c.referenceRateBRL ?? null,
          referenceRateARS: c.referenceRateARS ?? null,
          referenceRateBOB: c.referenceRateBOB ?? null,
          actuarialWeight: c.actuarialWeight,
          applicableSeverities: c.applicableSeverities,
          requiresAnesthesia: c.requiresAnesthesia,
          requiresHospitalization: c.requiresHospitalization,
          typicalDurationMinutes: c.typicalDurationMinutes ?? null,
          requiresCBO: c.requiresCBO ?? null,
          isActive: true,
        },
        create: {
          code: c.code,
          system: c.system as BillingSystem,
          version: c.version,
          country: c.country,
          shortDescription: c.shortDescription,
          fullDescription: c.fullDescription,
          category: c.category,
          referenceRateBRL: c.referenceRateBRL ?? null,
          referenceRateARS: c.referenceRateARS ?? null,
          referenceRateBOB: c.referenceRateBOB ?? null,
          actuarialWeight: c.actuarialWeight,
          applicableSeverities: c.applicableSeverities,
          requiresAnesthesia: c.requiresAnesthesia,
          requiresHospitalization: c.requiresHospitalization,
          typicalDurationMinutes: c.typicalDurationMinutes ?? null,
          requiresCBO: c.requiresCBO ?? null,
          isActive: true,
          effectiveDate: new Date(c.effectiveDate),
        },
      });
      total++;
    }
    console.log(`  ✓ ${file} — ${data.codes.length} codes`);
  }

  return total;
}

async function main() {
  console.log('🏥 Seeding procedure codes...');
  try {
    const count = await seedProcedureCodes();
    console.log(`✅ Procedure codes done — ${count} upserted`);
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
