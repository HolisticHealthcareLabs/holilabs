/**
 * Billing Intelligence — Insurer Seeder
 *
 * Seeds the Insurer table with real payer data for Brazil (ANS),
 * Argentina (SSSalud), and Bolivia (INASES/CNS).
 *
 * Uses upsert with deterministic unique keys per country:
 *   BR → ansCode, AR → rnos, BO → cnsCode
 * Safe to re-run — idempotent.
 */

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface InsurerInput {
  name: string;
  shortName: string;
  country: string;
  insurerType: string;
  ansCode?: string;
  cnpj?: string;
  cuitCode?: string;
  rnos?: string;
  cnsCode?: string;
  npiNumber?: string;
  naicCode?: string;
  provinceCode?: string;
  rutCode?: string;
  rfcCode?: string;
  tissTissVersion?: string;
  estimatedMembers?: number;
  coverageRegions: string[];
  productLines: string[];
  isActive: boolean;
  effectiveDate: string;
}

function loadJson(relativePath: string): { insurers: InsurerInput[] } {
  const absPath = path.resolve(__dirname, '../../data/master', relativePath);
  return JSON.parse(fs.readFileSync(absPath, 'utf-8'));
}

export async function seedInsurers(): Promise<number> {
  const files = [
    'insurers/brazil-ans-insurers.json',
    'insurers/bolivia-insurers.json',
    'insurers/argentina-insurers.json',
    'insurers/united-states-insurers.json',
    'insurers/canada-insurers.json',
    'insurers/colombia-insurers.json',
    'insurers/mexico-insurers.json',
  ];

  let total = 0;

  for (const file of files) {
    const data = loadJson(file);
    for (const ins of data.insurers) {
      // Build unique where clause based on available country identifier
      let whereClause: Record<string, string> = {};
      if (ins.ansCode) {
        whereClause = { ansCode: ins.ansCode };
      } else if (ins.rnos) {
        whereClause = { rnos: ins.rnos };
      } else if (ins.cnsCode) {
        whereClause = { cnsCode: ins.cnsCode };
      } else if (ins.naicCode) {
        whereClause = { naicCode: ins.naicCode };
      } else if (ins.rutCode) {
        whereClause = { rutCode: ins.rutCode };
      } else if (ins.rfcCode) {
        whereClause = { rfcCode: ins.rfcCode };
      } else if (ins.cuitCode) {
        whereClause = { cuitCode: ins.cuitCode };
      } else if (ins.npiNumber) {
        whereClause = { npiNumber: ins.npiNumber };
      } else {
        console.warn(`  ⚠ No unique identifier for insurer: ${ins.shortName}`);
        continue;
      }

      const commonData = {
        name: ins.name,
        shortName: ins.shortName,
        country: ins.country,
        insurerType: ins.insurerType,
        tissTissVersion: ins.tissTissVersion ?? null,
        estimatedMembers: ins.estimatedMembers ?? null,
        coverageRegions: ins.coverageRegions,
        productLines: ins.productLines,
        isActive: ins.isActive,
        effectiveDate: new Date(ins.effectiveDate),
        cnpj: ins.cnpj ?? null,
      };

      await prisma.insurer.upsert({
        where: whereClause as Parameters<typeof prisma.insurer.upsert>[0]['where'],
        update: commonData,
        create: {
          ...commonData,
          ansCode: ins.ansCode ?? null,
          cuitCode: ins.cuitCode ?? null,
          rnos: ins.rnos ?? null,
          cnsCode: ins.cnsCode ?? null,
          npiNumber: ins.npiNumber ?? null,
          naicCode: ins.naicCode ?? null,
          provinceCode: ins.provinceCode ?? null,
          rutCode: ins.rutCode ?? null,
          rfcCode: ins.rfcCode ?? null,
        },
      });
      total++;
    }
    console.log(`  ✓ ${file} — ${data.insurers.length} insurers`);
  }

  return total;
}

async function main() {
  console.log('🏦 Seeding insurers...');
  try {
    const count = await seedInsurers();
    console.log(`✅ Insurers done — ${count} upserted`);
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
