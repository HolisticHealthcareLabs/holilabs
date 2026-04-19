/**
 * CLI runner for CNES data ingest.
 *
 * Usage:
 *   npx tsx prisma/ingest-cnes.ts establishments --file /path/to/cnes-estabs.csv
 *   npx tsx prisma/ingest-cnes.ts professionals  --file /path/to/cnes-vinculos.csv
 *
 * Options:
 *   --file <path>         Path to the CSV file (required)
 *   --max-rows <n>        Abort after N rows (useful for dry-runs)
 *   --batch-size <n>      Rows per DB flush (default 500)
 *
 * Real-world workflow (DATASUS bulk data):
 *   1. Download monthly CSV/DBC exports from ftp://ftp.datasus.gov.br/cnes/
 *   2. Convert DBC→CSV if needed (use dbf2csv, blast_dbf, or similar)
 *   3. Run establishments ingest FIRST (professionals reference CNES codes)
 *   4. Run professionals ingest
 *   5. Reindex Meilisearch: `npx tsx prisma/reindex-providers.ts`
 */
import { PrismaClient } from '@prisma/client';
import { ingestCnesEstablishments } from '../src/lib/ingest/cnes/establishments';
import { ingestCnesProfessionals } from '../src/lib/ingest/cnes/professionals';

interface Args {
  mode: 'establishments' | 'professionals';
  file: string;
  maxRows?: number;
  batchSize?: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const mode = argv[0];

  if (mode !== 'establishments' && mode !== 'professionals') {
    console.error('First argument must be "establishments" or "professionals"');
    console.error('Usage: npx tsx prisma/ingest-cnes.ts <mode> --file <path> [--max-rows <n>] [--batch-size <n>]');
    process.exit(1);
  }

  const parsed: Partial<Args> = { mode };

  for (let i = 1; i < argv.length; i++) {
    const key = argv[i];
    const val = argv[i + 1];
    if (key === '--file' && val) { parsed.file = val; i++; }
    else if (key === '--max-rows' && val) { parsed.maxRows = Number(val); i++; }
    else if (key === '--batch-size' && val) { parsed.batchSize = Number(val); i++; }
  }

  if (!parsed.file) {
    console.error('--file <path> is required');
    process.exit(1);
  }

  return parsed as Args;
}

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();

  try {
    console.log(`[CNES] Starting ${args.mode} ingest from ${args.file}`);
    if (args.maxRows) console.log(`[CNES] Limiting to first ${args.maxRows} rows`);

    const onProgress = (c: { imported: number; updated: number; errored: number }) => {
      console.log(`[CNES] progress: imported=${c.imported} updated=${c.updated} errored=${c.errored}`);
    };

    const result = args.mode === 'establishments'
      ? await ingestCnesEstablishments(prisma, {
          filePath: args.file,
          maxRows: args.maxRows,
          batchSize: args.batchSize,
          onProgress,
        })
      : await ingestCnesProfessionals(prisma, {
          filePath: args.file,
          maxRows: args.maxRows,
          batchSize: args.batchSize,
          onProgress,
        });

    console.log(`\n[CNES] ${args.mode} ingest complete in ${result.durationMs}ms`);
    console.log(`  runId:    ${result.runId}`);
    console.log(`  imported: ${result.counters.imported}`);
    console.log(`  updated:  ${result.counters.updated}`);
    console.log(`  errored:  ${result.counters.errored}`);
  } catch (err) {
    console.error('[CNES] Ingest failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
