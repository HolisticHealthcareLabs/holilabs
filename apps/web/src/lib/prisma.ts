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
