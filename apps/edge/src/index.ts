/**
 * Holi Labs Edge Node
 *
 * LOCAL-FIRST ARCHITECTURE:
 * This server runs on hospital LAN and provides:
 * - Traffic Light evaluation with <10ms latency
 * - Offline queue for assurance events
 * - Rule sync from cloud (firewall-safe HTTPS long polling)
 * - Patient cache for offline operation
 *
 * The edge node NEVER requires internet for blocking decisions.
 * It syncs with the cloud asynchronously when connection is stable.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from './lib/prisma.js';
import { logger } from './utils/logger.js';
import { createApiRouter } from './api/index.js';
import { startSyncServices } from './sync/index.js';

// Initialize Prisma
const prisma = new PrismaClient();

// Configuration
const PORT = process.env.EDGE_PORT || 3001;
const CLOUD_URL = process.env.CLOUD_URL || 'https://api.holilabs.com';
const CLINIC_ID = process.env.CLINIC_ID;

async function main() {
  logger.info('Starting Holi Labs Edge Node...');

  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connection established (SQLite)');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }

  // Initialize Express app
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;

      // Get sync state
      const syncState = await prisma.syncState.findFirst({
        orderBy: { updatedAt: 'desc' },
      });

      const ruleVersion = await prisma.ruleVersion.findFirst({
        where: { isActive: true },
        orderBy: { timestamp: 'desc' },
      });

      // Check staleness
      const now = new Date();
      const lastSync = syncState?.lastSyncTime || new Date(0);
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
      const isStale = hoursSinceSync > 48;
      const isCritical = hoursSinceSync > 168; // 7 days

      res.json({
        status: 'healthy',
        version: '1.0.0',
        database: 'connected',
        sync: {
          connectionStatus: syncState?.connectionStatus || 'unknown',
          lastSync: lastSync.toISOString(),
          hoursSinceSync: Math.round(hoursSinceSync),
          isStale,
          isCritical,
        },
        rules: {
          version: ruleVersion?.version || 'none',
          timestamp: ruleVersion?.timestamp?.toISOString() || null,
        },
        clinic: {
          id: CLINIC_ID || 'not_configured',
        },
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // API routes
  app.use('/api', createApiRouter(prisma));

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start HTTP server
  app.listen(PORT, () => {
    logger.info(`Edge node listening on port ${PORT}`);
    logger.info(`Cloud URL: ${CLOUD_URL}`);
    logger.info(`Clinic ID: ${CLINIC_ID || 'not configured'}`);
  });

  // Start sync services (rule updates, queue processing)
  await startSyncServices(prisma, CLOUD_URL);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down edge node...');
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error', { error });
  process.exit(1);
});

export { prisma };
