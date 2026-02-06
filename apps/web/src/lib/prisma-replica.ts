/**
 * Prisma Client with Read Replica Support
 *
 * This module configures Prisma to use read replicas for improved performance.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

function getReplicaUrls(): string[] {
  const urls: string[] = [];
  if (process.env.DATABASE_REPLICA_URL) urls.push(process.env.DATABASE_REPLICA_URL);
  if (process.env.DATABASE_REPLICA_URLS) {
    urls.push(...process.env.DATABASE_REPLICA_URLS.split(',').map(url => url.trim()).filter(Boolean));
  }
  return urls;
}

export function createPrismaWithReplicas(basePrisma: PrismaClient): PrismaClient {
  const replicaUrls = getReplicaUrls();

  if (replicaUrls.length === 0) {
    return basePrisma;
  }

  const replicaClients = replicaUrls.map(url => new PrismaClient({ datasources: { db: { url } } }));

  try {
    // HARDENED: Use eval('require') to hide from Webpack's static analysis
    const dynamicRequire = eval('require');
    const { readReplicas } = dynamicRequire('@prisma/extension-read-replicas');

    return basePrisma.$extends(
      readReplicas({
        replicas: replicaClients,
      })
    ) as unknown as PrismaClient;
  } catch (error) {
    logger.warn('Failed to load read replicas extension - falling back to primary-only');
    return basePrisma;
  }
}

export function createAnalyticsPrisma(basePrisma: PrismaClient): PrismaClient | null {
  const analyticsUrl = process.env.DATABASE_ANALYTICS_REPLICA_URL;
  if (!analyticsUrl) return null;

  const analyticsReplicaClient = new PrismaClient({ datasources: { db: { url: analyticsUrl } } });

  try {
    const dynamicRequire = eval('require');
    const { readReplicas } = dynamicRequire('@prisma/extension-read-replicas');

    return basePrisma.$extends(
      readReplicas({
        replicas: [analyticsReplicaClient],
      })
    ) as unknown as PrismaClient;
  } catch (error) {
    return analyticsReplicaClient as unknown as PrismaClient;
  }
}

export type { PrismaClient };
