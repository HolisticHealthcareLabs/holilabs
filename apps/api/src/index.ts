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

// ═══════════════════════════════════════════════════════════════════════════
// ADAPTIVE RATE LIMITING — AI-era probing detection
// Rule 1: 5+ distinct endpoints in 10s → 5 req/min for 10 minutes
// Rule 2: 3+ validation errors in 1min → blocked for 5 minutes
// ═══════════════════════════════════════════════════════════════════════════

interface IPTracker {
  endpoints: Set<string>;
  epWindowStart: number;
  valErrors: number;
  valWindowStart: number;
  blockedUntil: number;
  reducedUntil: number;
}

const ipTrackers = new Map<string, IPTracker>();

function getTracker(ip: string): IPTracker {
  let t = ipTrackers.get(ip);
  if (!t) {
    const now = Date.now();
    t = {
      endpoints: new Set(),
      epWindowStart: now,
      valErrors: 0,
      valWindowStart: now,
      blockedUntil: 0,
      reducedUntil: 0,
    };
    ipTrackers.set(ip, t);
  }
  return t;
}

// Prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, t] of ipTrackers) {
    if (now > t.blockedUntil && now > t.reducedUntil && now - t.epWindowStart > 900_000) {
      ipTrackers.delete(ip);
    }
  }
}, 300_000).unref();

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

    // ═══════════════════════════════════════════════════════════════════════
    // SECURITY HEADERS — Defense-in-depth (strict CSP, HSTS preload)
    // ═══════════════════════════════════════════════════════════════════════
    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    });

    // Headers not covered by Helmet
    server.addHook('onRequest', async (_request, reply) => {
      reply.header('X-Frame-Options', 'DENY');
      reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    });

    await server.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    // ═══════════════════════════════════════════════════════════════════════
    // RATE LIMITING — Adaptive tiered limits with probing detection
    // Global: 100 req/min | Flagged IPs: 5 req/min | Blocked: 0
    // ═══════════════════════════════════════════════════════════════════════
    await server.register(rateLimit, {
      max: (request: any, _key: string) => {
        const t = ipTrackers.get(request.ip);
        if (t && t.reducedUntil > Date.now()) return 5;
        return 100;
      },
      timeWindow: '1 minute',
      keyGenerator: (request: any) => request.ip,
      errorResponseBuilder: (_request: any, context: any) => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)}s.`,
      }),
    });

    // Adaptive probing detection — hooks for endpoint scanning and error tracking
    server.addHook('onRequest', async (request, reply) => {
      const ip = request.ip;
      const now = Date.now();
      const t = getTracker(ip);

      // Hard block for IPs exceeding validation error threshold
      if (t.blockedUntil > now) {
        server.log.warn({ ip, blockedUntil: new Date(t.blockedUntil).toISOString() },
          'SECURITY: Blocked IP attempted access');
        return reply.code(429).send({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Temporarily blocked due to suspicious activity.',
        });
      }

      // Endpoint diversity tracking (10-second sliding window)
      if (now - t.epWindowStart > 10_000) {
        t.endpoints = new Set();
        t.epWindowStart = now;
      }
      t.endpoints.add(request.routeOptions?.url || request.url);

      // 5+ distinct endpoints in 10s → automated scanning
      if (t.endpoints.size >= 5) {
        t.reducedUntil = now + 600_000; // 10 minutes at 5 req/min
        server.log.warn({ ip, endpoints: t.endpoints.size },
          'SECURITY: Automated probing detected — rate reduced to 5 req/min for 10min');
        t.endpoints = new Set();
        t.epWindowStart = now;
      }
    });

    server.addHook('onResponse', async (request, reply) => {
      if (reply.statusCode === 400 || reply.statusCode === 422) {
        const ip = request.ip;
        const now = Date.now();
        const t = getTracker(ip);

        // 1-minute sliding window for validation errors
        if (now - t.valWindowStart > 60_000) {
          t.valErrors = 0;
          t.valWindowStart = now;
        }
        t.valErrors++;

        // 3+ validation errors in 1 minute → block for 5 minutes
        if (t.valErrors >= 3) {
          t.blockedUntil = now + 300_000;
          server.log.warn({ ip, errors: t.valErrors },
            'SECURITY: Excessive validation errors — IP blocked for 5 minutes');
          t.valErrors = 0;
        }
      }
    });

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
