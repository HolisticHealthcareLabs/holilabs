/**
 * CFM Import Pipeline — Conselho Federal de Medicina (Brazil)
 *
 * Imports all registered Brazilian physicians from the CFM public API
 * into the PhysicianCatalog table. Idempotent — safe to re-run.
 *
 * Usage:
 *   # All states (full run — ~550K doctors, takes several hours):
 *   DATABASE_URL=... npx tsx src/scripts/import-cfm.ts
 *
 *   # Single state pilot (fastest for testing):
 *   DATABASE_URL=... STATE=SP npx tsx src/scripts/import-cfm.ts
 *
 *   # Multiple states:
 *   DATABASE_URL=... STATES=SP,RJ,MG npx tsx src/scripts/import-cfm.ts
 *
 * Rate limiting: CFM API has no documented limit; we use 200ms between
 * requests to be polite. Nominatim geocoding is limited to 1 req/sec.
 *
 * LGPD: Only commercial registry data is imported. No personal addresses.
 * CFM Resolution 2.299/2021 mandates doctors maintain a commercial
 * registration, making this data public record.
 */

import { PrismaClient } from '@prisma/client';
import { geocodeAddress, sleep } from '../lib/directory/geocode';
import { SPECIALTY_CFM_MAP } from '../lib/directory/specialties';

const prisma = new PrismaClient();

// All 27 Brazilian states + DF
const ALL_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO',
  'MA','MG','MS','MT','PA','PB','PE','PI','PR',
  'RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

// CFM API endpoints
const CFM_BASE = 'https://portal.cfm.org.br/api_rest_php/api/v1';

interface CfmMedico {
  crm: string;
  uf: string;
  nome: string;
  situacao: string;
  especialidade?: string;
  rqe?: string;
  municipio?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cep?: string;
  sexo?: string;
  foto?: string;
}

interface CfmApiResponse {
  medicos?: CfmMedico[];
  total?: number;
  pagina?: number;
  total_paginas?: number;
}

function cuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function computeCompleteness(doc: CfmMedico): number {
  let score = 0;
  if (doc.nome) score += 20;
  if (doc.especialidade) score += 20;
  if (doc.municipio) score += 15;
  if (doc.telefone) score += 15;
  if (doc.cep) score += 10;
  if (doc.logradouro) score += 10;
  if (doc.foto) score += 10;
  return score;
}

async function fetchPage(
  state: string,
  page: number,
  pageSize = 50
): Promise<CfmApiResponse | null> {
  try {
    const url = `${CFM_BASE}/medicos/busca?uf=${state}&pagina=${page}&quantidade=${pageSize}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`    CFM API ${res.status} for ${state} page ${page}`);
      return null;
    }
    return await res.json() as CfmApiResponse;
  } catch (err) {
    console.warn(`    Fetch error for ${state} page ${page}: ${String(err)}`);
    return null;
  }
}

async function upsertPhysician(doc: CfmMedico, geocode: boolean): Promise<void> {
  const specialtySlug = doc.especialidade
    ? (SPECIALTY_CFM_MAP.get(doc.especialidade) ?? null)
    : null;

  let lat: number | null = null;
  let lng: number | null = null;

  if (geocode && doc.logradouro && doc.municipio && doc.uf) {
    const address = [doc.logradouro, doc.numero].filter(Boolean).join(', ');
    const geo = await geocodeAddress(address, doc.municipio, doc.uf);
    if (geo) { lat = geo.lat; lng = geo.lng; }
    await sleep(1100); // Nominatim rate limit
  }

  const completeness = computeCompleteness(doc);

  const physician = await prisma.physicianCatalog.upsert({
    where: {
      country_registryId_registryState: {
        country: 'BR',
        registryId: doc.crm,
        registryState: doc.uf,
      },
    },
    create: {
      id: cuid(),
      country: 'BR',
      registryId: doc.crm,
      registryState: doc.uf,
      registrySource: 'CFM_BR',
      name: doc.nome,
      photoUrl: doc.foto ?? null,
      gender: doc.sexo ?? null,
      lat: lat !== null ? lat : null,
      lng: lng !== null ? lng : null,
      addressCity: doc.municipio ?? null,
      addressState: doc.uf,
      addressCep: doc.cep ?? null,
      addressStreet: doc.logradouro ?? null,
      phone: doc.telefone ?? null,
      email: doc.email ?? null,
      isRegistryActive: doc.situacao?.toLowerCase().includes('ativo') ?? true,
      publicProfileEnabled: true,
      lastSyncedAt: new Date(),
      completenessScore: completeness,
    },
    update: {
      name: doc.nome,
      photoUrl: doc.foto ?? null,
      gender: doc.sexo ?? null,
      ...(lat !== null ? { lat, lng } : {}),
      addressCity: doc.municipio ?? null,
      addressState: doc.uf,
      addressCep: doc.cep ?? null,
      phone: doc.telefone ?? null,
      isRegistryActive: doc.situacao?.toLowerCase().includes('ativo') ?? true,
      lastSyncedAt: new Date(),
      completenessScore: completeness,
    },
  });

  // Link specialty
  if (specialtySlug) {
    const specialty = await prisma.medicalSpecialty.findUnique({
      where: { slug: specialtySlug.slug },
    });
    if (specialty) {
      await prisma.physicianSpecialty.upsert({
        where: { physicianId_specialtyId: { physicianId: physician.id, specialtyId: specialty.id } },
        create: {
          id: cuid(),
          physicianId: physician.id,
          specialtyId: specialty.id,
          rqeNumber: doc.rqe ?? null,
          isPrimary: true,
        },
        update: { rqeNumber: doc.rqe ?? null },
      });
    }
  }
}

async function importState(state: string, geocode: boolean): Promise<number> {
  console.log(`\n  Importing state: ${state}`);
  let page = 1;
  let total = 0;

  while (true) {
    const data = await fetchPage(state, page);
    await sleep(200); // polite rate limit

    if (!data?.medicos?.length) break;

    for (const doc of data.medicos) {
      await upsertPhysician(doc, geocode);
      total++;
      if (total % 100 === 0) process.stdout.write(`\r    ${total} imported...`);
    }

    if (!data.total_paginas || page >= data.total_paginas) break;
    page++;
  }

  console.log(`\r    ${state}: ${total} doctors imported`);
  return total;
}

async function main() {
  const targetStates = process.env.STATE
    ? [process.env.STATE.toUpperCase()]
    : process.env.STATES
    ? process.env.STATES.split(',').map((s) => s.trim().toUpperCase())
    : ALL_STATES;

  // Geocoding is expensive (1.1s/doctor). Disable for initial bulk import.
  const geocode = process.env.GEOCODE === 'true';

  console.log(`CFM Import Pipeline`);
  console.log(`States: ${targetStates.join(', ')}`);
  console.log(`Geocoding: ${geocode ? 'ENABLED (slow)' : 'DISABLED (fast)'}`);
  console.log(`Started: ${new Date().toISOString()}`);

  let grandTotal = 0;
  for (const state of targetStates) {
    grandTotal += await importState(state, geocode);
  }

  const total = await prisma.physicianCatalog.count({ where: { country: 'BR' } });
  console.log(`\nFinished. Imported ${grandTotal} in this run. Total BR in DB: ${total}`);
  console.log(`Completed: ${new Date().toISOString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
