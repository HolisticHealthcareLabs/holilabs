/**
 * Prisma Client with Read Replica Support
 *
 * This module configures Prisma to use read replicas for improved performance.
 */

import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const esmRequire = createRequire(import.meta.url);

function getReplicaUrls(): string[] {
  const urls: string[] = [];
  if (process.env.DATABASE_REPLICA_URL) urls.push(process.env.DATABASE_REPLICA_URL);
  if (process.env.DATABASE_REPLICA_URLS) {
    urls.push(...process.env.DATABASE_REPLICA_URLS.split(',').map(url => url.trim()).filter(Boolean));
  }
  return urls;
}

function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return 'invalid-url';
  }
}

function parseHost(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.host;
  } catch {
    return null;
  }
}

export function createPrismaWithReplicas(basePrisma: PrismaClient): PrismaClient {
  const replicaUrls = getReplicaUrls();

  if (replicaUrls.length === 0) {
    return basePrisma;
  }

  logger.info({
    event: 'read_replicas_enabled',
    replicaUrls: replicaUrls.map(maskUrl),
  }, `Enabling ${replicaUrls.length} read replica(s)`);

  const replicaClients = replicaUrls.map(url => new PrismaClient({ datasources: { db: { url } } }));

  try {
    const { readReplicas } = esmRequire('@prisma/extension-read-replicas');

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

  const host = parseHost(analyticsUrl);
  if (!host) {
    logger.warn({ event: 'analytics_replica_invalid_url' }, 'Invalid analytics replica URL');
    return null;
  }

  logger.info({ event: 'analytics_replica_enabled', host }, 'Analytics replica enabled');

  const analyticsReplicaClient = new PrismaClient({ datasources: { db: { url: analyticsUrl } } });

  try {
    const { readReplicas } = esmRequire('@prisma/extension-read-replicas');

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
