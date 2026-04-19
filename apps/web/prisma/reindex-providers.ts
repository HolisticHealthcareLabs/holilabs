/**
 * Bulk reindex all providers into Meilisearch.
 *
 * Usage:
 *   MEILI_HOST=http://localhost:7700 \
 *   MEILI_MASTER_KEY=... \
 *     npx tsx prisma/reindex-providers.ts
 *
 * If MEILI_MASTER_KEY is not set, the script exits cleanly — the app
 * gracefully falls back to Prisma in that case.
 */
import { PrismaClient } from '@prisma/client';
import { reindexAllProviders } from '../src/lib/search/meilisearch';

const prisma = new PrismaClient();

async function main() {
  if (!process.env.MEILI_MASTER_KEY) {
    console.log('MEILI_MASTER_KEY not set — skipping reindex. App will use Prisma search.');
    process.exit(0);
  }

  console.log(`Reindexing providers to Meilisearch at ${process.env.MEILI_HOST ?? 'http://localhost:7700'}...`);
  const ok = await reindexAllProviders(prisma);
  if (ok) {
    console.log('Reindex complete.');
  } else {
    console.error('Reindex failed. See logs.');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('Reindex failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
