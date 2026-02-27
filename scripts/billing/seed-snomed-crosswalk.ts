/**
 * Billing Intelligence — SNOMED Crosswalk Seeder
 *
 * Seeds the SnomedCrosswalk table: maps SNOMED concept IDs to national
 * billing codes for BR, AR, and BO.
 *
 * MUST run AFTER seed-procedure-codes (requires ProcedureCode rows to exist).
 * Uses upsert with (snomedConceptId, country, procedureCodeId) unique key.
 */

import { PrismaClient, BillingSystem } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface CrosswalkMapping {
  country: string;
  code: string;
  system: string;
  mappingType: string;
  confidence: number;
}

interface CrosswalkEntry {
  snomedConceptId: string;
  snomedFsn: string;
  mappings: CrosswalkMapping[];
}

interface CrosswalkFile {
  mappings: CrosswalkEntry[];
}

export async function seedSnomedCrosswalk(): Promise<{ seeded: number; skipped: number }> {
  const filePath = path.resolve(__dirname, '../../data/master/procedure-codes/snomed-crosswalk.json');
  const data: CrosswalkFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let seeded = 0;
  let skipped = 0;

  for (const entry of data.mappings) {
    for (const mapping of entry.mappings) {
      // Lookup the procedure code DB row
      const procedureCode = await prisma.procedureCode.findFirst({
        where: {
          code: mapping.code,
          system: mapping.system as BillingSystem,
          isActive: true,
        },
      });

      if (!procedureCode) {
        console.warn(`  ⚠ Skipping crosswalk for SNOMED ${entry.snomedConceptId} → ${mapping.code} (${mapping.system}): ProcedureCode not found`);
        skipped++;
        continue;
      }

      await prisma.snomedCrosswalk.upsert({
        where: {
          snomedConceptId_country_procedureCodeId: {
            snomedConceptId: entry.snomedConceptId,
            country: mapping.country,
            procedureCodeId: procedureCode.id,
          },
        },
        update: {
          snomedFsn: entry.snomedFsn,
          mappingType: mapping.mappingType,
          confidence: mapping.confidence,
        },
        create: {
          snomedConceptId: entry.snomedConceptId,
          snomedFsn: entry.snomedFsn,
          country: mapping.country,
          procedureCodeId: procedureCode.id,
          mappingType: mapping.mappingType,
          confidence: mapping.confidence,
          sourceAuthority: 'HoliLabs',
        },
      });
      seeded++;
    }
  }

  console.log(`  ✓ SNOMED crosswalk — ${seeded} seeded, ${skipped} skipped (missing procedure codes)`);
  return { seeded, skipped };
}

async function main() {
  console.log('🔗 Seeding SNOMED crosswalk...');
  try {
    const result = await seedSnomedCrosswalk();
    console.log(`✅ SNOMED crosswalk done — ${result.seeded} seeded`);
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
