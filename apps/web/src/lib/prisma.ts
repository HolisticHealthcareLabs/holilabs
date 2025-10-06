/**
 * Prisma Client Singleton - Production-Ready Configuration
 *
 * Ensures only one Prisma client instance is created
 * Includes connection pooling and timeout configuration
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Connection pool configuration
 * Adjust based on your DigitalOcean database plan
 */
const CONNECTION_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10', 10);
const CONNECTION_TIMEOUT = parseInt(process.env.DB_TIMEOUT || '10000', 10); // 10 seconds

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
      console.warn('⚠️  DATABASE_URL not set - Prisma client will not be initialized');
    }
    return null;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],

    // Production-grade connection settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

// Lazy initialization - only create client when first accessed
const prismaClient = globalForPrisma.prisma ?? createPrismaClient();

// Create a proxy that throws helpful errors if Prisma is not initialized
export const prisma = new Proxy(prismaClient as PrismaClient, {
  get(target, prop) {
    if (target === null) {
      throw new Error(
        'Prisma client not initialized: DATABASE_URL environment variable is not set. ' +
        'Please configure DATABASE_URL in your environment variables.'
      );
    }
    return (target as any)[prop];
  },
});

// Configure connection pool via environment variable
// Add to .env: DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10"

if (process.env.NODE_ENV !== 'production' && prismaClient) {
  globalForPrisma.prisma = prismaClient;
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production' && prismaClient) {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database connections...');
    await prismaClient.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database connections...');
    await prismaClient.$disconnect();
    process.exit(0);
  });
}

export default prisma;
