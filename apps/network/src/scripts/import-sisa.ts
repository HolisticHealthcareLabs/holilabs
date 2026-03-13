/**
 * SISA/REFEPS Import Pipeline — Argentina
 *
 * Imports registered Argentine physicians from the SISA REFEPS
 * (Red Federal de Registros de Profesionales de la Salud) API.
 *
 * API: https://sisa.msal.gov.ar/sisa/
 * Docs: https://sisa.msal.gov.ar/sisadoc/docs/050102/refeps_dic_home.jsp
 *
 * Usage:
 *   DATABASE_URL=... SISA_TOKEN=<token> npx tsx src/scripts/import-sisa.ts
 *
 *   # Filter by province:
 *   DATABASE_URL=... SISA_TOKEN=<token> PROVINCE=Buenos+Aires npx tsx src/scripts/import-sisa.ts
 *
 * Authentication: SISA requires registration at sisa.msal.gov.ar to
 * obtain an API token. Free registration for healthcare organizations.
 *
 * Rate limiting: SISA recommends max 10 req/sec. We use 150ms delay.
 */

import { PrismaClient } from '@prisma/client';
import { sleep } from '../lib/directory/geocode';

const prisma = new PrismaClient();

const SISA_BASE = 'https://sisa.msal.gov.ar/sisa/services/rest';

// SISA specialty code → our MedicalSpecialty slug mapping
// Source: SISA REFEPS specialty codebook
const SISA_SPECIALTY_MAP: Record<string, string> = {
  '1':  'clinica-medica',
  '2':  'cardiologia',
  '3':  'dermatologia',
  '4':  'endocrinologia',
  '5':  'gastroenterologia',
  '6':  'ginecologia-obstetricia',
  '7':  'hematologia-hemoterapia',
  '8':  'infectologia',
  '9':  'medicina-intensiva',
  '10': 'nefrologia',
  '11': 'neurologia',
  '12': 'oftalmologia',
  '13': 'oncologia-clinica',
  '14': 'ortopedia-traumatologia',
  '15': 'otorrinolaringologia',
  '16': 'patologia',
  '17': 'pediatria',
  '18': 'pneumologia',
  '19': 'psiquiatria',
  '20': 'radiologia',
  '21': 'reumatologia',
  '22': 'urologia',
  '23': 'cirurgia-geral',
  '24': 'anestesiologia',
  '25': 'cirurgia-cardiovascular',
  '26': 'neurocirurgia',
  '27': 'cirurgia-plastica',
  '28': 'geriatria',
  '29': 'medicina-familia',
  '30': 'medicina-emergencia',
};

interface SisaMedico {
  cuil?: string;
  apellido?: string;
  nombre?: string;
  especialidad_codigo?: string;
  especialidad_nombre?: string;
  provincia?: string;
  localidad?: string;
  matricula_nacional?: string;
  matricula_provincial?: string;
  habilitado?: string;
  telefono?: string;
  email?: string;
}

interface SisaResponse {
  profesionales?: SisaMedico[];
  total?: number;
  offset?: number;
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchPage(
  token: string,
  offset: number,
  limit = 100,
  province?: string
): Promise<SisaResponse | null> {
  const params = new URLSearchParams({
    token,
    offset: String(offset),
    limit: String(limit),
    profesion: '04', // Médico (código SISA)
    ...(province ? { provincia: province } : {}),
  });

  try {
    const res = await fetch(`${SISA_BASE}/refeps/profesionales?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`    SISA API ${res.status} at offset ${offset}`);
      return null;
    }
    return await res.json() as SisaResponse;
  } catch (err) {
    console.warn(`    SISA fetch error at offset ${offset}: ${String(err)}`);
    return null;
  }
}

async function upsertPhysician(doc: SisaMedico): Promise<void> {
  if (!doc.cuil || !doc.apellido) return;

  const name = [doc.apellido, doc.nombre].filter(Boolean).join(', ');
  const registryId = doc.matricula_nacional ?? doc.matricula_provincial ?? doc.cuil;
  const isActive = doc.habilitado?.toLowerCase() === 'si' || doc.habilitado === '1';

  const physician = await prisma.physicianCatalog.upsert({
    where: {
      country_registryId_registryState: {
        country: 'AR',
        registryId,
        registryState: doc.provincia ?? null as unknown as string,
      },
    },
    create: {
      id: cuid(),
      country: 'AR',
      registryId,
      registryState: doc.provincia ?? null,
      registrySource: 'SISA_AR',
      name,
      addressCity: doc.localidad ?? null,
      addressState: doc.provincia ?? null,
      phone: doc.telefono ?? null,
      email: doc.email ?? null,
      isRegistryActive: isActive,
      publicProfileEnabled: true,
      lastSyncedAt: new Date(),
      completenessScore: [name, doc.especialidad_nombre, doc.localidad, doc.telefono].filter(Boolean).length * 25,
    },
    update: {
      name,
      addressCity: doc.localidad ?? null,
      phone: doc.telefono ?? null,
      isRegistryActive: isActive,
      lastSyncedAt: new Date(),
    },
  });

  // Link specialty
  const specialtySlug = doc.especialidad_codigo
    ? SISA_SPECIALTY_MAP[doc.especialidad_codigo]
    : null;

  if (specialtySlug) {
    const specialty = await prisma.medicalSpecialty.findUnique({ where: { slug: specialtySlug } });
    if (specialty) {
      await prisma.physicianSpecialty.upsert({
        where: { physicianId_specialtyId: { physicianId: physician.id, specialtyId: specialty.id } },
        create: { id: cuid(), physicianId: physician.id, specialtyId: specialty.id, isPrimary: true },
        update: {},
      });
    }
  }
}

async function main() {
  const token = process.env.SISA_TOKEN;
  if (!token) {
    console.error('SISA_TOKEN is required. Register at sisa.msal.gov.ar to obtain one.');
    process.exit(1);
  }

  const province = process.env.PROVINCE;
  const pageSize = 100;

  console.log(`SISA Import Pipeline`);
  console.log(`Province filter: ${province ?? 'all'}`);
  console.log(`Started: ${new Date().toISOString()}`);

  let offset = 0;
  let total = 0;

  while (true) {
    const data = await fetchPage(token, offset, pageSize, province);
    await sleep(150);

    if (!data?.profesionales?.length) break;

    for (const doc of data.profesionales) {
      await upsertPhysician(doc);
      total++;
      if (total % 200 === 0) process.stdout.write(`\r  ${total} imported...`);
    }

    offset += pageSize;
    if (data.total !== undefined && offset >= data.total) break;
  }

  const dbTotal = await prisma.physicianCatalog.count({ where: { country: 'AR' } });
  console.log(`\nFinished. Imported ${total} in this run. Total AR in DB: ${dbTotal}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
