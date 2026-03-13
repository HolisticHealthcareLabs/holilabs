/**
 * SIREPRO Import Pipeline — Paraguay
 *
 * Imports physician data from Paraguay's SIREPRO system.
 *
 * SIREPRO does not have a public REST API. This script supports two modes:
 *
 * 1. CSV mode (preferred): If you have a CSV export from SIREPRO or the
 *    Control de Profesiones portal, set SIREPRO_CSV_PATH.
 *
 * 2. Web scrape mode (fallback): Fetches the public search page at
 *    sirepro.mspbs.gov.py and parses results. This is fragile and should
 *    only be used as a last resort. Rate limited to 1 req/sec.
 *
 * Usage:
 *   # CSV mode (preferred):
 *   DATABASE_URL=... SIREPRO_CSV_PATH=./sirepro_medicos.csv npx tsx src/scripts/import-sirepro-py.ts
 *
 *   # Web scrape mode (slow, fragile):
 *   DATABASE_URL=... SCRAPE=true npx tsx src/scripts/import-sirepro-py.ts
 *
 * Idempotent — upserts on (country='PY', registryId, registryState=null).
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

const SIREPRO_BASE = 'https://sirepro.mspbs.gov.py';

// Paraguayan specialty → our slug mapping
const PY_SPECIALTY_MAP: Record<string, string> = {
  'cardiología': 'cardiologia', 'dermatología': 'dermatologia',
  'neurología': 'neurologia', 'traumatología': 'ortopedia-traumatologia',
  'ortopedia': 'ortopedia-traumatologia', 'gastroenterología': 'gastroenterologia',
  'ginecología': 'ginecologia-obstetricia', 'ginecología y obstetricia': 'ginecologia-obstetricia',
  'pediatría': 'pediatria', 'psiquiatría': 'psiquiatria',
  'oftalmología': 'oftalmologia', 'endocrinología': 'endocrinologia',
  'urología': 'urologia', 'neumología': 'pneumologia',
  'medicina interna': 'clinica-medica', 'cirugía general': 'cirurgia-geral',
  'anestesiología': 'anestesiologia', 'oncología': 'oncologia-clinica',
  'nefrología': 'nefrologia', 'infectología': 'infectologia',
  'medicina familiar': 'medicina-familia', 'medicina de emergencia': 'medicina-emergencia',
  'neonatología': 'neonatologia', 'reumatología': 'reumatologia',
};

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ';' || ch === ',') && !inQuotes) { fields.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  fields.push(current.trim());
  return fields;
}

async function importFromCsv(csvPath: string): Promise<void> {
  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split('\n').filter((l: string) => l.trim());
  const headers = parseCsvLine(lines[0]).map((h: string) => h.toLowerCase().trim());

  const findCol = (patterns: string[]) => {
    for (const p of patterns) {
      const idx = headers.findIndex((h: string) => h.includes(p));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const iNombre = findCol(['nombre', 'apellido', 'profesional']);
  const iRegistro = findCol(['registro', 'matricula', 'numero']);
  const iEspecialidad = findCol(['especialidad']);
  const iEstado = findCol(['estado', 'vigencia', 'habilitado']);

  if (iNombre < 0) {
    console.error('Could not find "nombre" column in CSV.');
    console.log('Headers found:', headers.join(', '));
    process.exit(1);
  }

  const dataLines = lines.slice(1);
  console.log(`Processing ${dataLines.length} rows from CSV...`);
  let imported = 0;

  for (const line of dataLines) {
    const f = parseCsvLine(line);
    const nombre = f[iNombre]?.trim();
    if (!nombre) continue;

    const registryId = iRegistro >= 0 ? (f[iRegistro]?.trim() || `PY-${imported}`) : `PY-${imported}`;
    const especialidad = iEspecialidad >= 0 ? f[iEspecialidad]?.trim().toLowerCase() : '';
    const isActive = iEstado >= 0 ? (f[iEstado]?.trim().toLowerCase().includes('vigente') || f[iEstado]?.trim() === '1') : true;

    try {
      const physician = await prisma.physicianCatalog.upsert({
        where: { country_registryId_registryState: { country: 'PY', registryId, registryState: '' } },
        create: {
          id: cuid(), country: 'PY', registryId, registryState: null,
          registrySource: 'CMP_PY', name: nombre,
          isRegistryActive: isActive, publicProfileEnabled: true,
          lastSyncedAt: new Date(), completenessScore: nombre ? 30 : 0,
        },
        update: { name: nombre, isRegistryActive: isActive, lastSyncedAt: new Date() },
      });

      const slug = PY_SPECIALTY_MAP[especialidad] ?? null;
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
      if (imported % 200 === 0) process.stdout.write(`\r  ${imported} imported...`);
    } catch { /* skip errors */ }
  }

  console.log(`\n  CSV import done: ${imported} physicians`);
}

async function importFromScrape(): Promise<void> {
  console.log('Web scrape mode — this is slow and fragile.');
  console.log(`Scraping ${SIREPRO_BASE}...`);

  // The SIREPRO web interface requires POST to a search form.
  // We search by common Paraguayan last names to get coverage.
  const SEARCH_NAMES = [
    'González', 'Rodríguez', 'Fernández', 'López', 'Martínez',
    'García', 'Benítez', 'Ramírez', 'Giménez', 'Cabrera',
    'Vera', 'Acosta', 'Villalba', 'Romero', 'Duarte',
    'Núñez', 'Espínola', 'Ortiz', 'Torres', 'Amarilla',
  ];

  let totalImported = 0;

  for (const surname of SEARCH_NAMES) {
    try {
      const res = await fetch(`${SIREPRO_BASE}/index.php?apellido=${encodeURIComponent(surname)}`, {
        headers: { 'User-Agent': 'HoliNetwork/1.0 (holi.health)' },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`  ${surname}: HTTP ${res.status} — skipping`);
        continue;
      }

      const html = await res.text();

      // Parse simple table rows from the HTML response
      // SIREPRO renders results in an HTML table
      const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

      for (const row of rowMatches) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
        if (cells.length < 2) continue;

        const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();
        const name = cells[0] ? stripTags(cells[0]) : '';
        const registryId = cells[1] ? stripTags(cells[1]) : `PY-${totalImported}`;
        const specialty = cells[2] ? stripTags(cells[2]).toLowerCase() : '';

        if (!name || name.includes('Nombre') || name.includes('Profesional')) continue;

        try {
          const physician = await prisma.physicianCatalog.upsert({
            where: { country_registryId_registryState: { country: 'PY', registryId, registryState: '' } },
            create: {
              id: cuid(), country: 'PY', registryId, registryState: null,
              registrySource: 'CMP_PY', name,
              isRegistryActive: true, publicProfileEnabled: true,
              lastSyncedAt: new Date(), completenessScore: 25,
            },
            update: { name, lastSyncedAt: new Date() },
          });

          const slug = PY_SPECIALTY_MAP[specialty] ?? null;
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
          totalImported++;
        } catch { /* skip */ }
      }

      console.log(`  ${surname}: found ${rowMatches.length} rows`);
      await sleep(1100); // polite rate limit
    } catch (err) {
      console.warn(`  ${surname}: ${String(err)}`);
    }
  }

  console.log(`\n  Scrape done: ${totalImported} physicians`);
}

async function main() {
  const csvPath = process.env.SIREPRO_CSV_PATH;
  const scrapeMode = process.env.SCRAPE === 'true';

  console.log('SIREPRO Paraguay Import Pipeline');
  console.log(`Started: ${new Date().toISOString()}`);

  if (csvPath) {
    await importFromCsv(csvPath);
  } else if (scrapeMode) {
    await importFromScrape();
  } else {
    console.error('Set SIREPRO_CSV_PATH for CSV mode or SCRAPE=true for web scrape mode.');
    process.exit(1);
  }

  const total = await prisma.physicianCatalog.count({ where: { country: 'PY' } });
  console.log(`Total PY in DB: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
