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
import { logger } from '@/lib/logger';
import { encryptPHI, decryptPHI } from '@/lib/security/encryption';

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
  }, 'Initializing Prisma client with connection pool');

  const client = new PrismaClient({
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

  // Log slow queries in development
  if (process.env.NODE_ENV === 'development') {
    client.$on('query' as never, (e: any) => {
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
  client.$on('error' as never, (e: any) => {
    logger.error({
      event: 'database_error',
      message: e.message,
      target: e.target,
    }, 'Database error occurred');
  });

  // Log warnings
  client.$on('warn' as never, (e: any) => {
    logger.warn({
      event: 'database_warning',
      message: e.message,
    }, 'Database warning');
  });

  // ============================================================================
  // PHI ENCRYPTION MIDDLEWARE (HIPAA Compliance)
  // ============================================================================
  // Automatically encrypt/decrypt PHI fields on Patient model

  client.$use(async (params, next) => {
    // Fields that contain PHI and need encryption
    const phiFields = ['firstName', 'lastName', 'email', 'phone', 'address'];

    // ENCRYPT on write operations
    if (params.model === 'Patient') {
      if (params.action === 'create' || params.action === 'update' || params.action === 'upsert') {
        const data = params.action === 'upsert' ? params.args.create : params.args.data;

        if (data) {
          for (const field of phiFields) {
            if (data[field] !== undefined && data[field] !== null) {
              try {
                data[field] = encryptPHI(data[field]);
              } catch (error) {
                logger.error({ event: 'phi_encryption_failed', field, err: error }, 'Failed to encrypt PHI field');
                throw error;
              }
            }
          }

          // Also encrypt update data in upsert
          if (params.action === 'upsert' && params.args.update) {
            for (const field of phiFields) {
              if (params.args.update[field] !== undefined && params.args.update[field] !== null) {
                try {
                  params.args.update[field] = encryptPHI(params.args.update[field]);
                } catch (error) {
                  logger.error({ event: 'phi_encryption_failed', field, err: error }, 'Failed to encrypt PHI field');
                  throw error;
                }
              }
            }
          }
        }
      }
    }

    // Execute the query
    const result = await next(params);

    // DECRYPT on read operations
    if (params.model === 'Patient' && result) {
      const decryptPatient = (patient: any) => {
        if (!patient) return patient;

        for (const field of phiFields) {
          if (patient[field]) {
            try {
              patient[field] = decryptPHI(patient[field]);
            } catch (error) {
              logger.error({ event: 'phi_decryption_failed', field, err: error }, 'Failed to decrypt PHI field');
              // Don't throw - return encrypted value to prevent data loss
            }
          }
        }
        return patient;
      };

      if (Array.isArray(result)) {
        // findMany
        result.forEach(decryptPatient);
      } else if (result) {
        // findUnique, findFirst, create, update
        decryptPatient(result);
      }
    }

    return result;
  });

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
export const prisma = (() => {
  // If we're at runtime (not build) and DATABASE_URL is NOW available but wasn't during build
  if (!prismaClient && process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    prismaClient = createPrismaClient();
  }
  return prismaClient;
})() as PrismaClient | null;

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
    await prismaClient.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info({ event: 'shutdown', signal: 'SIGINT' }, 'SIGINT received, closing database connections...');
    await prismaClient.$disconnect();
    process.exit(0);
  });
}

export default prisma;
