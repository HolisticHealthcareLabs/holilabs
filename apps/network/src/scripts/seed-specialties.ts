/**
 * Seed MedicalSpecialty table with all 55 CFM specialties + 30 RQEs.
 *
 * Run: npx tsx src/scripts/seed-specialties.ts
 * Idempotent — safe to re-run. Uses upsert on slug.
 */

import { PrismaClient } from '@prisma/client';
import { MEDICAL_SPECIALTIES } from '../lib/directory/specialties';

const prisma = new PrismaClient();

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

async function main() {
  console.log(`Seeding ${MEDICAL_SPECIALTIES.length} specialties...`);

  // First pass: upsert all parent specialties
  const parents = MEDICAL_SPECIALTIES.filter((s) => !s.parentSlug);
  for (const s of parents) {
    await prisma.medicalSpecialty.upsert({
      where: { slug: s.slug },
      create: {
        id: cuid(),
        cfmCode: s.cfmCode,
        slug: s.slug,
        displayPt: s.displayPt,
        displayEs: s.displayEs,
        isAreaOfExpertise: false,
        parentId: null,
      },
      update: {
        cfmCode: s.cfmCode,
        displayPt: s.displayPt,
        displayEs: s.displayEs,
      },
    });
  }
  console.log(`  ✓ ${parents.length} parent specialties`);

  // Second pass: upsert RQEs with parent FK
  const rqes = MEDICAL_SPECIALTIES.filter((s) => s.parentSlug);
  for (const s of rqes) {
    const parent = await prisma.medicalSpecialty.findUnique({
      where: { slug: s.parentSlug! },
    });
    if (!parent) {
      console.warn(`  ⚠ Parent not found for ${s.slug} (parentSlug=${s.parentSlug})`);
      continue;
    }
    await prisma.medicalSpecialty.upsert({
      where: { slug: s.slug },
      create: {
        id: cuid(),
        cfmCode: s.cfmCode,
        slug: s.slug,
        displayPt: s.displayPt,
        displayEs: s.displayEs,
        isAreaOfExpertise: true,
        parentId: parent.id,
      },
      update: {
        cfmCode: s.cfmCode,
        displayPt: s.displayPt,
        displayEs: s.displayEs,
        parentId: parent.id,
      },
    });
  }
  console.log(`  ✓ ${rqes.length} RQEs / areas of expertise`);

  const total = await prisma.medicalSpecialty.count();
  console.log(`Done. Total in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
