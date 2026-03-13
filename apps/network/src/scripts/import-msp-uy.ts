/**
 * MSP Infotítulos Import Pipeline — Uruguay
 *
 * Parses the Infotítulos CSV published by Uruguay's Ministerio de Salud Pública
 * and upserts physicians into PhysicianCatalog.
 *
 * Data source: https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/microdatos/infotitulos-base-datos
 * Format: CSV (12+ MB), semicolon-separated, ISO-8859-1 encoding, updated annually
 *
 * Usage:
 *   # Download the CSV first, then:
 *   DATABASE_URL=... MSP_CSV_PATH=./infotitulos.csv npx tsx src/scripts/import-msp-uy.ts
 *
 * Idempotent — upserts on (country='UY', registryId, registryState=null).
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

// MSP profession labels that indicate "Médico"
const MEDICO_KEYWORDS = ['médico', 'medico', 'medicina', 'doctor en medicina'];

// Map Uruguayan specialty names → our MedicalSpecialty slugs
const UY_SPECIALTY_MAP: Record<string, string> = {
  'cardiología': 'cardiologia', 'cardiologia': 'cardiologia',
  'dermatología': 'dermatologia', 'dermatologia': 'dermatologia',
  'neurología': 'neurologia', 'neurologia': 'neurologia',
  'ortopedia y traumatología': 'ortopedia-traumatologia', 'traumatología': 'ortopedia-traumatologia',
  'gastroenterología': 'gastroenterologia', 'gastroenterologia': 'gastroenterologia',
  'ginecología': 'ginecologia-obstetricia', 'ginecología y obstetricia': 'ginecologia-obstetricia',
  'pediatría': 'pediatria', 'pediatria': 'pediatria',
  'psiquiatría': 'psiquiatria', 'psiquiatria': 'psiquiatria',
  'oftalmología': 'oftalmologia', 'oftalmologia': 'oftalmologia',
  'endocrinología': 'endocrinologia', 'endocrinologia': 'endocrinologia',
  'urología': 'urologia', 'urologia': 'urologia',
  'neumología': 'pneumologia', 'pneumologia': 'pneumologia',
  'reumatología': 'reumatologia', 'reumatologia': 'reumatologia',
  'medicina interna': 'clinica-medica', 'clínica médica': 'clinica-medica',
  'cirugía general': 'cirurgia-geral', 'cirurgia general': 'cirurgia-geral',
  'anestesiología': 'anestesiologia', 'anestesiologia': 'anestesiologia',
  'oncología': 'oncologia-clinica', 'oncologia': 'oncologia-clinica',
  'nefrología': 'nefrologia', 'nefrologia': 'nefrologia',
  'infectología': 'infectologia', 'infectologia': 'infectologia',
  'geriatría': 'geriatria', 'geriatria': 'geriatria',
  'medicina familiar': 'medicina-familia', 'medicina de familia': 'medicina-familia',
};

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ';' && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

async function main() {
  const csvPath = process.env.MSP_CSV_PATH;
  if (!csvPath) {
    console.error('MSP_CSV_PATH is required.');
    console.log('\nTo get the CSV:');
    console.log('  1. Go to https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/microdatos/infotitulos-base-datos');
    console.log('  2. Download the CSV file');
    console.log('  3. Run: MSP_CSV_PATH=./infotitulos.csv npx tsx src/scripts/import-msp-uy.ts');
    process.exit(1);
  }

  console.log('MSP Uruguay Import Pipeline');
  console.log(`CSV: ${csvPath}`);

  const raw = readFileSync(csvPath, 'latin1');
  const lines = raw.split('\n').filter((l: string) => l.trim());
  const headers = parseCsvLine(lines[0]).map((h: string) => h.toLowerCase().trim());

  const findCol = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = headers.findIndex((h: string) => h.includes(p));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iNombre = findCol(['nombre', 'apellido']);
  const iCedula = findCol(['cedula', 'documento', 'ci']);
  const iProfesion = findCol(['profesion', 'titulo', 'carrera']);
  const iEspecialidad = findCol(['especialidad', 'sub_especialidad']);
  const iCaja = findCol(['caja', 'caja_profesional']);

  if (iNombre < 0 || iCedula < 0) {
    console.error('Could not find required columns (nombre/cedula) in CSV header.');
    console.log('Found headers:', headers.join(', '));
    process.exit(1);
  }

  const dataLines = lines.slice(1);
  console.log(`Processing ${dataLines.length} rows...`);

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const line of dataLines) {
    const f = parseCsvLine(line);
    const nombre = f[iNombre]?.trim();
    const cedula = f[iCedula]?.trim();
    const profesion = iProfesion >= 0 ? f[iProfesion]?.trim().toLowerCase() : '';
    const especialidad = iEspecialidad >= 0 ? f[iEspecialidad]?.trim().toLowerCase() : '';

    if (!nombre || !cedula) { skipped++; continue; }

    // Only import physicians (skip nurses, dentists, psychologists, etc.)
    if (!MEDICO_KEYWORDS.some((kw) => profesion.includes(kw))) { skipped++; continue; }

    const registryId = iCaja >= 0 && f[iCaja]?.trim() ? f[iCaja].trim() : cedula;

    try {
      const physician = await prisma.physicianCatalog.upsert({
        where: { country_registryId_registryState: { country: 'UY', registryId, registryState: '' } },
        create: {
          id: cuid(), country: 'UY', registryId, registryState: null,
          registrySource: 'MSP_UY', name: nombre,
          isRegistryActive: true, publicProfileEnabled: true,
          lastSyncedAt: new Date(), completenessScore: nombre ? 40 : 0,
        },
        update: { name: nombre, lastSyncedAt: new Date() },
      });

      // Link specialty if found
      const slug = UY_SPECIALTY_MAP[especialidad] ?? null;
      if (slug) {
        const spec = await prisma.medicalSpecialty.findUnique({ where: { slug } });
        if (spec) {
          await prisma.physicianSpecialty.upsert({
            where: { physicianId_specialtyId: { physicianId: physician.id, specialtyId: spec.id } },
            create: { id: cuid(), physicianId: physician.id, specialtyId: spec.id, isPrimary: true },
            update: {},
          });
        }
      }

      imported++;
      if (imported % 500 === 0) process.stdout.write(`\r  ${imported} imported, ${skipped} skipped...`);
    } catch {
      skipped++;
    }
  }

  const total = await prisma.physicianCatalog.count({ where: { country: 'UY' } });
  console.log(`\nDone. Imported: ${imported}, Skipped: ${skipped}. Total UY in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
