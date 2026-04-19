/**
 * CNES establishments CSV ingest.
 *
 * Input: a CSV file with CNES headers (see CnesEstablishmentRow). DATASUS
 * publishes monthly bulk CSV exports at
 *   ftp://ftp.datasus.gov.br/cnes/
 *
 * The parser is tolerant of header variants — we look up columns via a
 * dictionary of aliases because DATASUS rotates header casing between
 * extracts (NO_FANTASIA vs No_Fantasia vs NOFANTASIA).
 *
 * Behavior:
 *   - Streams the CSV (constant memory for any file size)
 *   - Upserts in batches of `batchSize` on CNES code
 *   - Writes a DataSourceSyncLog record for the run
 *   - Idempotent: running twice produces the same DB state
 */
import { PrismaClient, EstablishmentType } from '@prisma/client';
import Papa from 'papaparse';
import { createReadStream } from 'node:fs';
import { startRun, completeRun, failRun, type RunCounters } from '../run-log';
import { mapCnesTypeToEnum } from './type-mapping';

// Column aliases — first match wins
const COL = {
  cnesCode: ['CO_UNIDADE', 'CO_CNES', 'COD_CNES', 'CNES'],
  cnpj: ['NU_CNPJ', 'CNPJ'],
  fantasyName: ['NO_FANTASIA', 'NOME_FANTASIA'],
  officialName: ['NO_RAZAO_SOCIAL', 'RAZAO_SOCIAL', 'NOME_OFICIAL'],
  type: ['TP_UNIDADE', 'CO_TIPO_UNIDADE', 'TIPO_UNIDADE'],
  city: ['NO_MUNICIPIO', 'MUNICIPIO'],
  state: ['CO_SIGLA_ESTADO', 'UF', 'SIGLA_UF'],
  cep: ['CO_CEP', 'CEP'],
  street: ['NO_LOGRADOURO', 'LOGRADOURO', 'ENDERECO'],
  lat: ['NU_LATITUDE', 'LATITUDE'],
  lng: ['NU_LONGITUDE', 'LONGITUDE'],
  phone: ['NU_TELEFONE', 'TELEFONE'],
  email: ['DS_EMAIL', 'EMAIL'],
} as const;

type ColKey = keyof typeof COL;

export interface CnesIngestOptions {
  filePath: string;
  batchSize?: number;
  /** Log progress every N rows */
  progressInterval?: number;
  /** Optional source identifier override (default: "cnes-establishments") */
  sourceId?: string;
  /** Abort early after N rows (for testing) */
  maxRows?: number;
  /** Receive per-batch progress callbacks (optional) */
  onProgress?: (counters: RunCounters) => void;
}

export interface CnesIngestResult {
  runId: string;
  counters: RunCounters;
  durationMs: number;
}

interface NormalizedEstablishment {
  cnesCode: string;
  cnpj: string | null;
  name: string;
  tradeName: string | null;
  type: EstablishmentType;
  country: 'BR';
  addressCity: string | null;
  addressState: string | null;
  addressCep: string | null;
  addressStreet: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
}

function resolveColumn(row: Record<string, string>, key: ColKey): string | null {
  for (const alias of COL[key]) {
    if (alias in row && row[alias] != null && String(row[alias]).trim() !== '') {
      return String(row[alias]).trim();
    }
  }
  return null;
}

function parseNumeric(value: string | null): number | null {
  if (!value) return null;
  // DATASUS uses comma as decimal in some extracts
  const normalized = value.replace(',', '.').replace(/[^-0-9.]/g, '');
  if (normalized === '' || normalized === '-') return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function normalize(row: Record<string, string>): NormalizedEstablishment | null {
  const cnesCode = resolveColumn(row, 'cnesCode');
  if (!cnesCode) return null;

  const fantasy = resolveColumn(row, 'fantasyName');
  const official = resolveColumn(row, 'officialName');
  const name = official ?? fantasy ?? `CNES ${cnesCode}`;

  return {
    cnesCode,
    cnpj: resolveColumn(row, 'cnpj'),
    name,
    tradeName: fantasy,
    type: mapCnesTypeToEnum(resolveColumn(row, 'type')),
    country: 'BR',
    addressCity: resolveColumn(row, 'city'),
    addressState: resolveColumn(row, 'state'),
    addressCep: resolveColumn(row, 'cep'),
    addressStreet: resolveColumn(row, 'street'),
    lat: parseNumeric(resolveColumn(row, 'lat')),
    lng: parseNumeric(resolveColumn(row, 'lng')),
    phone: resolveColumn(row, 'phone'),
    email: resolveColumn(row, 'email'),
  };
}

export async function ingestCnesEstablishments(
  prisma: PrismaClient,
  opts: CnesIngestOptions,
): Promise<CnesIngestResult> {
  const batchSize = opts.batchSize ?? 500;
  const progressInterval = opts.progressInterval ?? 1000;
  const sourceId = opts.sourceId ?? 'cnes-establishments';
  const started = Date.now();

  const runId = await startRun(sourceId);
  const counters: RunCounters = { imported: 0, updated: 0, errored: 0 };

  try {
    const batch: NormalizedEstablishment[] = [];

    await new Promise<void>((resolve, reject) => {
      const stream = createReadStream(opts.filePath, { encoding: 'utf-8' });
      let rowsSeen = 0;
      let aborted = false;

      Papa.parse<Record<string, string>>(stream as unknown as NodeJS.ReadableStream, {
        header: true,
        skipEmptyLines: true,
        delimiter: '',  // auto-detect (; for DATASUS)
        step: (result, parser) => {
          if (aborted) return;
          if (opts.maxRows && rowsSeen >= opts.maxRows) {
            aborted = true;
            parser.abort();
            return;
          }
          rowsSeen++;

          try {
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
          } catch {
            counters.errored++;
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
  batch: NormalizedEstablishment[],
  counters: RunCounters,
): Promise<void> {
  for (const item of batch) {
    try {
      const existing = await prisma.healthcareEstablishment.findUnique({
        where: { cnesCode: item.cnesCode },
        select: { id: true },
      });

      await prisma.healthcareEstablishment.upsert({
        where: { cnesCode: item.cnesCode },
        update: {
          ...item,
          lastSyncedAt: new Date(),
          isActive: true,
        },
        create: {
          ...item,
          lastSyncedAt: new Date(),
          isActive: true,
        },
      });

      if (existing) counters.updated++;
      else counters.imported++;
    } catch {
      counters.errored++;
    }
  }
}
