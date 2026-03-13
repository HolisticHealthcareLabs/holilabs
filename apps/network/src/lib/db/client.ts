/**
 * Prisma client singleton for @holi/network.
 * Uses the same DATABASE_URL as the rest of the monorepo but is a separate
 * client instance — fully isolated from apps/web's prisma singleton.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { networkPrisma: PrismaClient };

export const prisma =
  globalForPrisma.networkPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.networkPrisma = prisma;
}
