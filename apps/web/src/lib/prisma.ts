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

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
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

// Configure connection pool via environment variable
// Add to .env: DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=10"

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database connections...');
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database connections...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default prisma;
