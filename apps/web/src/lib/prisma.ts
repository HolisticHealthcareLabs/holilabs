/**
 * Prisma Client Singleton - Production-Ready Configuration
 *
 * Features:
 * - Connection pooling with configurable limits
 * - Automatic retry logic for failed connections
 * - Query logging in development
 * - Graceful shutdown handling
 * - Performance monitoring
 *
 * Connection Pool Settings:
 * - Default pool size: 10 connections
 * - Connection timeout: 10 seconds
 * - Query timeout: 15 seconds
 * - Pool timeout: 10 seconds
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@bemi-db/prisma';
import { logger } from '@/lib/logger';
import { encryptionExtension } from '@/lib/db/encryption-extension';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Connection pool configuration
 * Adjust based on your database plan:
 * - DigitalOcean Basic: 25 connections max
 * - DigitalOcean Pro: 97 connections max
 * - Supabase Free: 60 connections max
 * - Supabase Pro: 200 connections max
 *
 * Rule of thumb: pool_size = (max_connections - 10) / number_of_app_instances
 * Example: 60 max connections / 2 instances = 25 per instance (leave 10 for admin)
 */
const CONNECTION_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10', 10);
const CONNECTION_TIMEOUT = parseInt(process.env.DB_TIMEOUT || '10000', 10); // 10 seconds
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '15000', 10); // 15 seconds
const POOL_TIMEOUT = parseInt(process.env.DB_POOL_TIMEOUT || '10000', 10); // 10 seconds

/**
 * Build DATABASE_URL with connection pool parameters
 */
function buildDatabaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);

    // Add connection pool parameters to query string
    const params = new URLSearchParams(url.search);

    // Set pool parameters
    if (!params.has('connection_limit')) {
      params.set('connection_limit', CONNECTION_POOL_SIZE.toString());
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', Math.ceil(POOL_TIMEOUT / 1000).toString()); // Convert to seconds
    }
    if (!params.has('connect_timeout')) {
      params.set('connect_timeout', Math.ceil(CONNECTION_TIMEOUT / 1000).toString());
    }

    // Add SSL mode if not present (required for most cloud databases)
    if (!params.has('sslmode') && process.env.NODE_ENV === 'production') {
      params.set('sslmode', 'require');
    }

    url.search = params.toString();
    return url.toString();
  } catch (error) {
    logger.warn({ event: 'database_url_parse_error', err: error }, 'Could not parse DATABASE_URL, using as-is');
    return baseUrl;
  }
}

/**
 * Create Prisma Client instance (lazy initialization)
 * Only instantiates when DATABASE_URL is available (runtime, not build time)
 */
function createPrismaClient(): PrismaClient | null {
  // Skip initialization during build if DATABASE_URL is missing
  // This allows Next.js to build static pages without a database
  if (!process.env.DATABASE_URL) {
    // During build (when this is expected), just log a warning
    if (process.env.NODE_ENV !== 'production') {
      logger.warn({ event: 'database_url_missing' }, 'DATABASE_URL not set - Prisma client will not be initialized');
    }
    return null;
  }

  const databaseUrl = buildDatabaseUrl(process.env.DATABASE_URL);

  logger.info({
    event: 'prisma_client_init',
    poolSize: CONNECTION_POOL_SIZE,
    connectionTimeout: CONNECTION_TIMEOUT,
    queryTimeout: QUERY_TIMEOUT,
    poolTimeout: POOL_TIMEOUT,
    bemiEnabled: process.env.ENABLE_BEMI_AUDIT === 'true',
  }, 'Initializing Prisma client with connection pool');

  // Create Bemi-enhanced Prisma adapter for SOC 2 audit trail
  // This captures all DB changes at the PostgreSQL WAL level
  const adapter = process.env.ENABLE_BEMI_AUDIT === 'true'
    ? new PrismaPg({ connectionString: databaseUrl })
    : undefined;

  const baseClient = new PrismaClient({
    // Use Bemi adapter if enabled (requires PostgreSQL with WAL replication)
    ...(adapter ? { adapter } : {}),

    // Logging configuration
    log: process.env.NODE_ENV === 'development'
      ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ]
      : [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],

    // Production-grade connection settings
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  // Set up event listeners on base client BEFORE applying extensions
  // Extended clients don't have $on methods

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development') {
    baseClient.$on('query' as never, (e: any) => {
      if (e.duration > 1000) {
        logger.warn({
          event: 'slow_query',
          query: e.query,
          duration: e.duration,
          params: e.params,
        }, 'Slow database query detected');
      }
    });
  }

  // Log all database errors
  baseClient.$on('error' as never, (e: any) => {
    logger.error({
      event: 'database_error',
      message: e.message,
      target: e.target,
    }, 'Database error occurred');
  });

  // Log warnings
  baseClient.$on('warn' as never, (e: any) => {
    logger.warn({
      event: 'database_warning',
      message: e.message,
    }, 'Database warning');
  });

  // Apply transparent encryption extension (SOC 2 Control CC6.7)
  // This automatically encrypts/decrypts PHI fields on all operations
  // TEMPORARILY DISABLED - encryption extension is blocking database access
  // TODO: Fix encryption extension initialization
  // const client = baseClient.$extends(encryptionExtension) as unknown as PrismaClient;
  const client = baseClient as unknown as PrismaClient;

  return client;
}

/**
 * Retry logic for database connections
 */
async function connectWithRetry(
  client: PrismaClient,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.$connect();
      logger.info({
        event: 'database_connected',
        attempt,
      }, 'Successfully connected to database');
      return;
    } catch (error) {
      logger.warn({
        event: 'database_connection_failed',
        attempt,
        maxRetries,
        err: error,
      }, `Database connection attempt ${attempt}/${maxRetries} failed`);

      if (attempt === maxRetries) {
        logger.error({
          event: 'database_connection_exhausted',
          maxRetries,
        }, 'All database connection attempts failed');
        throw error;
      }

      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      logger.info({
        event: 'database_connection_retry',
        delayMs: delay,
      }, `Retrying database connection in ${delay}ms...`);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  if (!prismaClient) {
    return { healthy: false, error: 'Prisma client not initialized' };
  }

  const startTime = Date.now();
  try {
    await prismaClient.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    return { healthy: true, latency };
  } catch (error: any) {
    return { healthy: false, error: error.message };
  }
}

// Lazy initialization - only create client when first accessed
let prismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Export prisma client with runtime check wrapper
// During build, this will be null (expected)
// At runtime, if DATABASE_URL is set, re-initialize
const _prisma = (() => {
  // If we're at runtime (not build) and DATABASE_URL is NOW available but wasn't during build
  if (!prismaClient && process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    prismaClient = createPrismaClient();
  }
  return prismaClient;
})();

// Export as non-null for type safety
// At runtime, throw an error if accessed without DATABASE_URL
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!_prisma) {
      throw new Error('Prisma client not initialized - DATABASE_URL is missing');
    }
    return (_prisma as any)[prop];
  },
}) as PrismaClient;

// Attempt to connect with retry in production
if (process.env.NODE_ENV === 'production' && prismaClient) {
  connectWithRetry(prismaClient).catch((error) => {
    logger.fatal({
      event: 'database_connection_fatal',
      err: error,
    }, 'Failed to connect to database after all retries');
    // Don't exit - let health checks report the issue
  });
}

if (process.env.NODE_ENV !== 'production' && prismaClient) {
  globalForPrisma.prisma = prismaClient;
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production' && prismaClient) {
  process.on('SIGTERM', async () => {
    logger.info({ event: 'shutdown', signal: 'SIGTERM' }, 'SIGTERM received, closing database connections...');
    await prismaClient!.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info({ event: 'shutdown', signal: 'SIGINT' }, 'SIGINT received, closing database connections...');
    await prismaClient!.$disconnect();
    process.exit(0);
  });
}

export default prisma;

// Also export _prisma for internal use when null checking is needed
export { _prisma };

// Read Replica Support (Performance Optimization)
// Import replica configuration
import { createPrismaWithReplicas, createAnalyticsPrisma } from './prisma-replica';

/**
 * Replica-aware Prisma client for read-heavy operations
 *
 * Automatically routes:
 * - Reads (findMany, findUnique, etc.) → Replica
 * - Writes (create, update, delete) → Primary
 *
 * Usage:
 * ```typescript
 * // Automatically uses replica for read
 * const patients = await prismaReplica.patient.findMany();
 *
 * // Force primary for critical reads
 * const user = await prismaReplica.$primary().user.findUnique({ where: { email } });
 * ```
 *
 * Requires environment variables:
 * - DATABASE_REPLICA_URL or DATABASE_REPLICA_URLS
 *
 * If no replica configured, falls back to primary for all queries.
 */
export const prismaReplica = _prisma ? createPrismaWithReplicas(_prisma) : prisma;

/**
 * Primary-only Prisma client
 *
 * Use when you explicitly need to query the primary database:
 * - Critical reads requiring absolute consistency
 * - Reads immediately after writes (read-your-writes)
 * - Authentication/session validation
 *
 * Usage:
 * ```typescript
 * const user = await prismaPrimary.user.findUnique({ where: { email } });
 * ```
 */
export const prismaPrimary = _prisma ?? prisma;

/**
 * Analytics-dedicated Prisma client
 *
 * Use for heavy reporting queries that should not impact production traffic.
 * Requires DATABASE_ANALYTICS_REPLICA_URL environment variable.
 *
 * Returns null if analytics replica not configured.
 *
 * Usage:
 * ```typescript
 * const analyticsPrisma = prismaAnalytics;
 * if (analyticsPrisma) {
 *   const report = await analyticsPrisma.auditLog.findMany({
 *     where: { timestamp: { gte: thirtyDaysAgo } },
 *     take: 100000, // Heavy query
 *   });
 * }
 * ```
 */
export const prismaAnalytics = _prisma ? createAnalyticsPrisma(_prisma) : null;
