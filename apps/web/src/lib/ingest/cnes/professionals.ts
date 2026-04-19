/**
 * CNES professionals CSV ingest.
 *
 * Input CSV must contain CNES linkage fields — one row per physician↔establishment
 * relationship. The same physician may appear on multiple rows (multi-site).
 *
 * This ingest:
 *   1. Upserts each physician into PhysicianCatalog (keyed by country+registryId+registryState)
 *   2. Creates PhysicianEstablishment links if the CNES code resolves to an existing establishment
 *      (establishment ingest MUST run first — we do not create establishments from this file)
 *   3. Skips rows where required fields are missing (logged as errored)
 *
 * CBO codes (Classificação Brasileira de Ocupações) for physicians:
 *   - 2251xx — Medical doctors
 *   - 2252xx — Surgeons
 *   - 2253xx — Psychiatrists
 * We retain rows whose CBO starts with "2251", "2252", or "2253" and drop the rest.
 */
import { PrismaClient, PhysicianRegistrySource } from '@prisma/client';
import Papa from 'papaparse';
import { createReadStream } from 'node:fs';
import { startRun, completeRun, failRun, type RunCounters } from '../run-log';

const COL = {
  professionalCrm: ['CO_PROFISSIONAL', 'CRM', 'COD_PROFISSIONAL', 'CO_CONSELHO'],
  name: ['NO_PROF', 'NOME', 'NO_PROFISSIONAL'],
  state: ['UF', 'CO_SIGLA_ESTADO', 'SG_UF'],
  cbo: ['CO_CBO', 'CBO', 'COD_CBO'],
  cnesCode: ['CO_UNIDADE', 'CO_CNES', 'CNES'],
  gender: ['TP_SEXO', 'SEXO'],
} as const;

const PHYSICIAN_CBO_PREFIXES = ['2251', '2252', '2253'] as const;

type ColKey = keyof typeof COL;

export interface CnesProfessionalsIngestOptions {
  filePath: string;
  batchSize?: number;
  progressInterval?: number;
  sourceId?: string;
  maxRows?: number;
  onProgress?: (counters: RunCounters) => void;
}

interface NormalizedProfessional {
  country: 'BR';
  registryId: string;
  registryState: string;
  registrySource: PhysicianRegistrySource;
  name: string;
  gender: 'M' | 'F' | null;
  cnesCode: string | null;
}

function resolveColumn(row: Record<string, string>, key: ColKey): string | null {
  for (const alias of COL[key]) {
    if (alias in row && row[alias] != null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  return null;
}

function isPhysicianCbo(cbo: string | null): boolean {
  if (!cbo) return false;
  return PHYSICIAN_CBO_PREFIXES.some((p) => cbo.startsWith(p));
}

function normalize(row: Record<string, string>): NormalizedProfessional | null {
  const crm = resolveColumn(row, 'professionalCrm');
  const state = resolveColumn(row, 'state');
  const name = resolveColumn(row, 'name');
  const cbo = resolveColumn(row, 'cbo');

  if (!crm || !state || !name) return null;
  if (!isPhysicianCbo(cbo)) return null;

  const genderRaw = resolveColumn(row, 'gender');
  const gender: 'M' | 'F' | null =
    genderRaw === 'M' || genderRaw === '1' ? 'M'
    : genderRaw === 'F' || genderRaw === '2' ? 'F'
    : null;

  return {
    country: 'BR',
    registryId: crm,
    registryState: state.toUpperCase(),
    registrySource: 'CFM_BR',
    name,
    gender,
    cnesCode: resolveColumn(row, 'cnesCode'),
  };
}

export async function ingestCnesProfessionals(
  prisma: PrismaClient,
  opts: CnesProfessionalsIngestOptions,
) {
  const batchSize = opts.batchSize ?? 500;
  const progressInterval = opts.progressInterval ?? 1000;
  const sourceId = opts.sourceId ?? 'cnes-professionals';
  const started = Date.now();

  const runId = await startRun(sourceId);
  const counters: RunCounters = { imported: 0, updated: 0, errored: 0 };

  try {
    const batch: NormalizedProfessional[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(opts.filePath, { encoding: 'utf-8' });
      let rowsSeen = 0;
      let aborted = false;

      Papa.parse<Record<string, string>>(stream as unknown as NodeJS.ReadableStream, {
        header: true,
        skipEmptyLines: true,
        delimiter: '',
        step: (result, parser) => {
          if (aborted) return;
          if (opts.maxRows && rowsSeen >= opts.maxRows) {
            aborted = true;
            parser.abort();
            return;
          }
          rowsSeen++;

          const normalized = normalize(result.data);
          if (!normalized) {
            counters.errored++;
            return;
          }
          batch.push(normalized);
          if (batch.length >= batchSize) {
            parser.pause();
            flushBatch(prisma, batch.splice(0, batch.length), counters)
              .then(() => {
                if (rowsSeen % progressInterval === 0 && opts.onProgress) {
                  opts.onProgress({ ...counters });
                }
                parser.resume();
              })
              .catch((err) => {
                parser.abort();
                reject(err);
              });
          }
        },
        complete: () => {
          if (batch.length > 0) {
            flushBatch(prisma, batch, counters).then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
        error: (err: Error) => reject(err),
      });
    });

    await completeRun(runId, counters);
    return { runId, counters, durationMs: Date.now() - started };
  } catch (err) {
    await failRun(runId, err, counters);
    throw err;
  }
}

async function flushBatch(
  prisma: PrismaClient,
  batch: NormalizedProfessional[],
  counters: RunCounters,
): Promise<void> {
  for (const item of batch) {
    try {
      const existing = await prisma.physicianCatalog.findUnique({
        where: {
          country_registryId_registryState: {
            country: item.country,
            registryId: item.registryId,
            registryState: item.registryState,
          },
        },
        select: { id: true },
      });

      const physician = await prisma.physicianCatalog.upsert({
        where: {
          country_registryId_registryState: {
            country: item.country,
            registryId: item.registryId,
            registryState: item.registryState,
          },
        },
        update: {
          name: item.name,
          gender: item.gender,
          lastSyncedAt: new Date(),
          isRegistryActive: true,
        },
        create: {
          country: item.country,
          registryId: item.registryId,
          registryState: item.registryState,
          registrySource: item.registrySource,
          name: item.name,
          gender: item.gender,
          isRegistryActive: true,
          publicProfileEnabled: true,
          lastSyncedAt: new Date(),
        },
        select: { id: true },
      });

      if (item.cnesCode) {
        const est = await prisma.healthcareEstablishment.findUnique({
          where: { cnesCode: item.cnesCode },
          select: { id: true },
        });
        if (est) {
          await prisma.physicianEstablishment.upsert({
            where: {
              physicianId_establishmentId: {
                physicianId: physician.id,
                establishmentId: est.id,
              },
            },
            update: {},
            create: {
              physicianId: physician.id,
              establishmentId: est.id,
              isPrimary: false,
            },
          });
        }
      }

      if (existing) counters.updated++;
      else counters.imported++;
    } catch {
      counters.errored++;
    }
  }
}
