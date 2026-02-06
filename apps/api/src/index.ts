import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@prisma/client';

// Environment validation (must be first)
import { env } from './lib/env-validation';

// FHIR infrastructure
import { initFhirQueue, shutdownFhirQueue, getQueueStats } from './services/fhir-queue';
import { registerFhirSyncMiddleware } from './lib/prisma-fhir-middleware';

// Routes
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import patientRoutes from './routes/patients';
import aiRoutes from './routes/ai';
import exportRoutes from './routes/exports';
import adminRoutes from './routes/admin';
// import fhirIngressRoutes from './routes/fhir-ingress';
import fhirAdminRoutes from './routes/fhir-admin';
// import fhirExportRoutes from './routes/fhir-export';
import monitoringRoutes from './routes/monitoring';
import telemetryRoutes from './routes/telemetry';

// Monitoring
import metricsMiddleware from './plugins/metrics-middleware';

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const server = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.email',
        '*.ssn',
        '*.cpf',
        '*.curp',
        '*.dni',
      ],
      remove: true,
    },
  },
});

async function start() {
  try {
    console.log('🚀 Starting Holi API Server...');
    console.log(`📦 Environment: ${env.NODE_ENV}`);
    console.log(`🔧 FHIR Sync: ${env.ENABLE_MEDPLUM === 'true' ? 'ENABLED' : 'DISABLED'}`);

    // Initialize Prisma middleware for FHIR auto-sync
    if (env.ENABLE_MEDPLUM === 'true') {
      registerFhirSyncMiddleware(prisma);

      // Initialize BullMQ queue for async FHIR operations
      const queue = await initFhirQueue(prisma);

      // Store queue on server instance for monitoring access
      server.decorate('fhirQueue', queue);
    }

    // Register plugins
    await server.register(metricsMiddleware); // Metrics middleware (must be early)

    await server.register(cors, {
      origin: env.CORS_ORIGIN,
      credentials: true,
    });

    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    });

    await server.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    // Rate limiting temporarily disabled for local development
    // TODO: Implement proper Redis client with ioredis
    // await server.register(rateLimit, {
    //   max: 100,
    //   timeWindow: '15 minutes',
    //   redis: env.REDIS_URL,
    // });

    // Health check removed - now handled by monitoring routes
    // (More comprehensive health checks in src/routes/monitoring.ts)

    // Register routes
    await server.register(monitoringRoutes); // Monitoring routes (no prefix, /metrics, /health, etc.)
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(uploadRoutes, { prefix: '/ingest' });
    await server.register(patientRoutes, { prefix: '/patients' });
    await server.register(aiRoutes, { prefix: '/ai' });
    await server.register(exportRoutes, { prefix: '/exports' });
    await server.register(adminRoutes, { prefix: '/admin' });

    // Telemetry (Sidecar -> Dashboard)
    await server.register(telemetryRoutes, { prefix: '/telemetry' });

    // FHIR routes (conditionally register if FHIR enabled)
    if (env.ENABLE_MEDPLUM === 'true') {
      await server.register(fhirAdminRoutes, { prefix: '/fhir/admin' });
      // Legacy FHIR Routes - Disabled for Visual-Only MVP
      // await server.register(fhirIngressRoutes, { prefix: '/fhir/inbound' });
      // await server.register(fhirExportRoutes, { prefix: '/fhir/export' });
    }

    // Start server
    await server.listen({ port: env.API_PORT, host: env.API_HOST });
    console.log(`✅ API server listening on http://${env.API_HOST}:${env.API_PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);

  try {
    // Shutdown FHIR queue first (stop accepting new jobs)
    if (env.ENABLE_MEDPLUM === 'true') {
      await shutdownFhirQueue();
    }

    // Close Fastify server (stop accepting new requests)
    await server.close();
    console.log('✅ Server closed');

    // Disconnect Prisma
    await prisma.$disconnect();
    console.log('✅ Database disconnected');

    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();

export { server, prisma };
