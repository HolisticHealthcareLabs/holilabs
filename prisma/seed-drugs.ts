/**
 * Formulary Drug Product Seeding Script
 *
 * Seeds DrugProduct catalog with common medications (generics + brands).
 * Ensures a default Organization exists for formulary rules.
 *
 * Run: pnpm tsx prisma/seed-drugs.ts
 * Or:  pnpm run db:seed:drugs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DRUG_PRODUCTS = [
  // Statins
  { name: 'Lipitor', genericName: 'Atorvastatin', therapeuticClass: 'Statin', marketPrice: 180.0 },
  { name: 'Crestor', genericName: 'Rosuvastatin', therapeuticClass: 'Statin', marketPrice: 220.0 },
  { name: 'Zocor', genericName: 'Simvastatin', therapeuticClass: 'Statin', marketPrice: 45.0 },
  { name: 'Atorvastatina', genericName: 'Atorvastatin', therapeuticClass: 'Statin', marketPrice: 35.0 },
  { name: 'Rosuvastatina', genericName: 'Rosuvastatin', therapeuticClass: 'Statin', marketPrice: 65.0 },
  // PPIs
  { name: 'Nexium', genericName: 'Esomeprazole', therapeuticClass: 'PPI', marketPrice: 150.0 },
  { name: 'Prilosec', genericName: 'Omeprazole', therapeuticClass: 'PPI', marketPrice: 30.0 },
  { name: 'Omeprazol', genericName: 'Omeprazole', therapeuticClass: 'PPI', marketPrice: 12.0 },
  { name: 'Esomeprazol', genericName: 'Esomeprazole', therapeuticClass: 'PPI', marketPrice: 55.0 },
  // ARBs / ACE inhibitors
  { name: 'Cozaar', genericName: 'Losartan', therapeuticClass: 'ARB', marketPrice: 95.0 },
  { name: 'Losartana', genericName: 'Losartan', therapeuticClass: 'ARB', marketPrice: 18.0 },
  { name: 'Diovan', genericName: 'Valsartan', therapeuticClass: 'ARB', marketPrice: 120.0 },
  { name: 'Valsartana', genericName: 'Valsartan', therapeuticClass: 'ARB', marketPrice: 42.0 },
  // Biguanides
  { name: 'Glucophage', genericName: 'Metformin', therapeuticClass: 'Biguanide', marketPrice: 85.0 },
  { name: 'Metformina', genericName: 'Metformin', therapeuticClass: 'Biguanide', marketPrice: 15.0 },
  // Beta blockers
  { name: 'Atenolol', genericName: 'Atenolol', therapeuticClass: 'Beta Blocker', marketPrice: 22.0 },
  { name: 'Lopressor', genericName: 'Metoprolol', therapeuticClass: 'Beta Blocker', marketPrice: 65.0 },
  { name: 'Metoprolol', genericName: 'Metoprolol', therapeuticClass: 'Beta Blocker', marketPrice: 28.0 },
  // Thyroid
  { name: 'Synthroid', genericName: 'Levothyroxine', therapeuticClass: 'Thyroid Hormone', marketPrice: 45.0 },
  { name: 'Levotiroxina', genericName: 'Levothyroxine', therapeuticClass: 'Thyroid Hormone', marketPrice: 20.0 },
];

const DEFAULT_ORG_ID = 'default-org';

async function ensureDefaultOrganization() {
  const existing = await prisma.organization.findUnique({ where: { id: DEFAULT_ORG_ID } });
  if (existing) {
    console.log(`  Default org exists: ${existing.id}`);
    return existing.id;
  }

  const org = await prisma.organization.create({
    data: {
      id: DEFAULT_ORG_ID,
      cnesCode: '0000001',
      cnpj: '00000000000001',
      razaoSocial: 'Default Clinical Organization',
      nomeFantasia: 'Default Clinic',
      street: 'Rua Exemplo',
      number: '100',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310100',
      municipalityCode: '3550308',
    },
  });
  console.log(`  Created default org: ${org.id}`);
  return org.id;
}

async function seedDrugProducts() {
  console.log('\n💊 Seeding DrugProduct catalog...');

  let created = 0;
  let skipped = 0;

  for (const drug of DRUG_PRODUCTS) {
    const existing = await prisma.drugProduct.findFirst({
      where: {
        name: drug.name,
        genericName: drug.genericName,
      },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.drugProduct.create({
      data: {
        name: drug.name,
        genericName: drug.genericName,
        therapeuticClass: drug.therapeuticClass,
        marketPrice: drug.marketPrice,
        isActive: true,
      },
    });
    created++;
  }

  console.log(`  ✅ Created ${created} drugs, skipped ${skipped} (already exist)`);
  console.log(`  Total DrugProducts: ${await prisma.drugProduct.count()}`);
}

async function main() {
  console.log('🌱 Starting formulary drug seeding...');

  try {
    await ensureDefaultOrganization();
    await seedDrugProducts();
    console.log('\n✅ Drug seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during drug seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
