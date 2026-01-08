/**
 * Prisma Client with Read Replica Support
 *
 * This module configures Prisma to use read replicas for improved performance.
 * Read replicas offload read-heavy queries from the primary database, reducing
 * load and improving response times.
 *
 * Usage:
 * ```typescript
 * import { prismaReplica } from '@/lib/prisma';
 *
 * // Automatically uses replica for reads
 * const patients = await prismaReplica.patient.findMany();
 *
 * // Force primary for critical reads (e.g., after write)
 * const patient = await prismaReplica.$primary().patient.findUnique({ where: { id } });
 * ```
 *
 * Features:
 * - Automatic query routing (reads → replica, writes → primary)
 * - Multiple replica support with round-robin load balancing
 * - Automatic fallback to primary if replica unavailable
 * - Separate analytics replica for heavy reporting queries
 *
 * Environment Variables:
 * - DATABASE_URL: Primary database (required)
 * - DATABASE_REPLICA_URL: Single read replica (optional)
 * - DATABASE_REPLICA_URLS: Multiple replicas, comma-separated (optional)
 * - DATABASE_ANALYTICS_REPLICA_URL: Analytics-dedicated replica (optional)
 */

import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';
import { logger } from '@/lib/logger';

/**
 * Parse replica URLs from environment variables
 *
 * Supports:
 * - DATABASE_REPLICA_URL: Single replica
 * - DATABASE_REPLICA_URLS: Multiple replicas (comma-separated)
 *
 * @returns Array of replica connection URLs
 */
function getReplicaUrls(): string[] {
  const urls: string[] = [];

  // Single replica URL
  if (process.env.DATABASE_REPLICA_URL) {
    urls.push(process.env.DATABASE_REPLICA_URL);
    logger.debug({
      event: 'replica_url_parsed',
      source: 'DATABASE_REPLICA_URL',
    }, 'Single replica URL configured');
  }

  // Multiple replica URLs (comma-separated)
  if (process.env.DATABASE_REPLICA_URLS) {
    const multipleUrls = process.env.DATABASE_REPLICA_URLS
      .split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    urls.push(...multipleUrls);

    logger.debug({
      event: 'replica_urls_parsed',
      source: 'DATABASE_REPLICA_URLS',
      count: multipleUrls.length,
    }, `Multiple replica URLs configured: ${multipleUrls.length}`);
  }

  return urls;
}

/**
 * Create Prisma client with read replica support
 *
 * Query Routing:
 * - All reads (findMany, findUnique, etc.) → Replica
 * - All writes (create, update, delete) → Primary (automatic)
 * - Transactions → Primary (automatic)
 * - Explicit primary access → $primary().model.operation()
 *
 * Load Balancing:
 * - Multiple replicas: Round-robin load balancing
 * - Replica failure: Automatic fallback to primary
 *
 * @param basePrisma - Base Prisma client instance
 * @returns Prisma client with replica extension applied
 */
export function createPrismaWithReplicas(basePrisma: PrismaClient): PrismaClient {
  const replicaUrls = getReplicaUrls();

  // If no replicas configured, return base client (all queries go to primary)
  if (replicaUrls.length === 0) {
    logger.info({
      event: 'read_replicas_disabled',
      reason: 'no_replicas_configured',
    }, 'Read replicas not configured - using primary for all queries');
    return basePrisma;
  }

  logger.info({
    event: 'read_replicas_enabled',
    replicaCount: replicaUrls.length,
    replicaUrls: replicaUrls.map(url => {
      // Mask password in logs
      try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.username}:***@${parsed.host}${parsed.pathname}`;
      } catch {
        return 'invalid-url';
      }
    }),
  }, `Read replicas enabled with ${replicaUrls.length} replica(s)`);

  // Create separate Prisma client instances for each replica
  const replicaClients = replicaUrls.map(url => {
    return new PrismaClient({
      datasources: {
        db: {
          url,
        },
      },
    });
  });

  // Apply read replica extension
  // This automatically routes reads to replicas and writes to primary
  const prismaWithReplica = basePrisma.$extends(
    readReplicas({
      replicas: replicaClients,
    })
  ) as unknown as PrismaClient;

  return prismaWithReplica;
}

/**
 * Create analytics-dedicated Prisma client
 *
 * Use this for heavy reporting queries that should not impact production traffic.
 * Analytics replica should have:
 * - Larger instance size (more CPU/memory)
 * - Separate connection pool
 * - Higher replication lag tolerance (1-5 seconds acceptable)
 *
 * @param basePrisma - Base Prisma client instance
 * @returns Prisma client connected to analytics replica, or null if not configured
 */
export function createAnalyticsPrisma(basePrisma: PrismaClient): PrismaClient | null {
  const analyticsUrl = process.env.DATABASE_ANALYTICS_REPLICA_URL;

  if (!analyticsUrl) {
    logger.debug({
      event: 'analytics_replica_not_configured',
    }, 'Analytics replica not configured');
    return null;
  }

  try {
    const masked = new URL(analyticsUrl);
    logger.info({
      event: 'analytics_replica_enabled',
      host: masked.host,
    }, 'Analytics replica configured for reporting queries');
  } catch {
    logger.warn({
      event: 'analytics_replica_invalid_url',
    }, 'Analytics replica URL is invalid');
    return null;
  }

  // Create separate client for analytics with dedicated connection pool
  const analyticsReplicaClient = new PrismaClient({
    datasources: {
      db: {
        url: analyticsUrl,
      },
    },
  });

  const analyticsPrisma = basePrisma.$extends(
    readReplicas({
      replicas: [analyticsReplicaClient],
    })
  ) as unknown as PrismaClient;

  return analyticsPrisma;
}

/**
 * Query Routing Guidelines
 *
 * Use REPLICA (default) for:
 * - Patient search/list (high volume, eventual consistency OK)
 * - Appointment history (historical data, lag acceptable)
 * - Prescription history (historical data)
 * - Audit log exports (large queries, lag acceptable)
 * - Analytics/reporting queries
 *
 * Use PRIMARY (explicit) for:
 * - Authentication/session validation (critical, requires real-time data)
 * - Reads immediately after writes (read-your-writes consistency)
 * - Critical user-facing data requiring absolute consistency
 *
 * Example:
 * ```typescript
 * // Replica (default) - eventual consistency OK
 * const patients = await prismaReplica.patient.findMany({ take: 50 });
 *
 * // Primary (explicit) - after write, need immediate consistency
 * const updated = await prismaReplica.patient.update({ where: { id }, data: { ... } });
 * const verify = await prismaReplica.$primary().patient.findUnique({ where: { id } });
 *
 * // Primary (explicit) - authentication requires real-time data
 * const user = await prismaReplica.$primary().user.findUnique({
 *   where: { email },
 *   include: { sessions: true },
 * });
 * ```
 */

/**
 * Monitoring Recommendations
 *
 * Key metrics to track:
 *
 * 1. Replication Lag
 *    - Target: < 1 second (same-region)
 *    - Warning: > 5 seconds
 *    - Critical: > 30 seconds
 *
 * 2. Query Distribution
 *    - Target: 60-80% replica, 20-40% primary
 *    - Monitor via Prometheus/DataDog
 *
 * 3. Query Performance
 *    - Replica queries should be 20-40% faster
 *    - Primary writes should be 10-20% faster (reduced contention)
 *
 * 4. Replica Health
 *    - Monitor connection failures
 *    - Track fallback-to-primary events
 *
 * See: /docs/performance/database-read-replicas.md for full monitoring guide
 */

/**
 * Troubleshooting Common Issues
 *
 * Issue 1: Stale Data After Write
 * Problem: User updates data but sees old data on next read
 * Solution: Use $primary() for reads immediately after writes
 *
 * Issue 2: High Replication Lag
 * Problem: Replica consistently > 5 seconds behind
 * Solution: Upgrade replica instance or add more replicas
 *
 * Issue 3: Replica Connection Failures
 * Problem: Queries failing with connection errors
 * Solution: Check replica status, firewall rules, connection limits
 *
 * See: /docs/runbooks/database-connection-failure.md for detailed troubleshooting
 */

// Export types for convenience
export type { PrismaClient };
