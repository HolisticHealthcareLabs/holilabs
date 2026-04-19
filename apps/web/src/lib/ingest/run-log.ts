/**
 * Wrapper around DataSourceSyncLog for ingest runs.
 *
 * Every ingestion job should:
 *   1. Call startRun(sourceId) at the top
 *   2. Accumulate counters as rows are processed
 *   3. Call completeRun(id, counters) on success OR failRun(id, err) on failure
 *
 * This gives us LGPD-compliant audit trail for every bulk data operation.
 */
import { prisma } from '@/lib/prisma';

export interface RunCounters {
  imported: number;
  updated: number;
  errored: number;
}

export async function startRun(sourceId: string): Promise<string> {
  const run = await prisma.dataSourceSyncLog.create({
    data: {
      sourceId,
      startedAt: new Date(),
      status: 'running',
    },
    select: { id: true },
  });
  return run.id;
}

export async function completeRun(id: string, counters: RunCounters): Promise<void> {
  await prisma.dataSourceSyncLog.update({
    where: { id },
    data: {
      completedAt: new Date(),
      status: 'completed',
      recordsImported: counters.imported,
      recordsUpdated: counters.updated,
      recordsErrored: counters.errored,
    },
  });
}

export async function failRun(id: string, error: unknown, partial?: RunCounters): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  await prisma.dataSourceSyncLog.update({
    where: { id },
    data: {
      completedAt: new Date(),
      status: 'failed',
      errorMessage: errorMessage.slice(0, 2000),
      ...(partial
        ? {
            recordsImported: partial.imported,
            recordsUpdated: partial.updated,
            recordsErrored: partial.errored,
          }
        : {}),
    },
  });
}
