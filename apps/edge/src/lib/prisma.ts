/**
 * Prisma Client Export for Edge Node
 *
 * Uses the locally generated Prisma client for SQLite.
 * This is separate from the main web app's PostgreSQL client.
 */

export * from '../generated/prisma/index.js';
export { PrismaClient } from '../generated/prisma/index.js';

// Re-export common types
export type {
  SyncState,
  QueueItem,
  RuleCache,
  RuleVersion,
  PatientCache,
  LocalAssuranceEvent,
  LocalHumanFeedback,
  TrafficLightLog,
} from '../generated/prisma/index.js';
