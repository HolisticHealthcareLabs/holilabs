/**
 * Monitoring Routes
 *
 * Endpoints for:
 * - Prometheus metrics scraping
 * - Health checks
 * - Readiness checks
 * - Liveness checks
 */

import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import {
  exportMetrics,
  exportMetricsJson,
  collectAllMetrics,
} from '../services/monitoring/prometheus-metrics';

const prisma = new PrismaClient();

const monitoringRoutes: FastifyPluginAsync = async (server) => {
  /**
   * GET /metrics
   * Prometheus metrics endpoint (text format)
   *
   * This endpoint is scraped by Prometheus every 15-30 seconds.
   * It must respond quickly (<1s) and in Prometheus text format.
   */
  server.get('/metrics', async (request, reply) => {
    try {
      // Collect latest metrics from queue and database
      if (server.fhirQueue) {
        await collectAllMetrics(server.fhirQueue, prisma);
      }

      // Export metrics in Prometheus text format
      const metrics = await exportMetrics();

      reply
        .code(200)
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(metrics);
    } catch (error) {
      console.error('Failed to export metrics:', error);
      reply.code(500).send({ error: 'Failed to export metrics' });
    }
  });

  /**
   * GET /metrics/json
   * Metrics in JSON format (for debugging)
   */
  server.get('/metrics/json', async (request, reply) => {
    try {
      const metrics = await exportMetricsJson();
      reply.code(200).send(metrics);
    } catch (error) {
      console.error('Failed to export metrics as JSON:', error);
      reply.code(500).send({ error: 'Failed to export metrics' });
    }
  });

  /**
   * GET /health
   * General health check
   *
   * Returns 200 if all CRITICAL dependencies are healthy:
   * - Database connection (REQUIRED)
   *
   * Optional checks (don't fail health status if disabled):
   * - Redis connection (only if FHIR is enabled)
   * - Medplum connectivity (only if FHIR is enabled)
   */
  server.get('/health', async (request, reply) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        redis: 'unknown',
        medplum: 'unknown',
      },
    };

    // CRITICAL CHECK: Database (required for all operations)
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy'; // This DOES fail the health check
    }

    // OPTIONAL CHECK: Redis (only needed if FHIR is enabled)
    const fhirEnabled = process.env.ENABLE_MEDPLUM === 'true';
    try {
      if (server.fhirQueue && fhirEnabled) {
        await server.fhirQueue.client.ping();
        health.checks.redis = 'healthy';
      } else if (fhirEnabled) {
        // FHIR enabled but queue not initialized - this is a real failure
        health.checks.redis = 'not_initialized';
        health.status = 'unhealthy';
      } else {
        // FHIR disabled - redis is optional
        health.checks.redis = 'not_required';
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
      health.checks.redis = 'unhealthy';
      if (fhirEnabled) {
        health.status = 'unhealthy'; // Only fail if FHIR is enabled
      }
    }

    // OPTIONAL CHECK: Medplum (only if enabled)
    try {
      const medplumEnabled = process.env.ENABLE_MEDPLUM === 'true';
      const medplumBaseUrl = process.env.MEDPLUM_BASE_URL;

      if (!medplumEnabled) {
        health.checks.medplum = 'not_required';
      } else if (medplumBaseUrl) {
        const response = await fetch(`${medplumBaseUrl}/healthcheck`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (response.ok) {
          health.checks.medplum = 'healthy';
        } else {
          health.checks.medplum = 'unhealthy';
          health.status = 'unhealthy'; // Only fail if enabled
        }
      } else {
        health.checks.medplum = 'not_configured';
      }
    } catch (error) {
      console.error('Medplum health check failed:', error);
      if (process.env.ENABLE_MEDPLUM === 'true') {
        health.checks.medplum = 'unhealthy';
        health.status = 'unhealthy'; // Only fail if enabled
      } else {
        health.checks.medplum = 'not_required';
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    reply.code(statusCode).send(health);
  });

  /**
   * GET /health/ready
   * Readiness check (Kubernetes)
   *
   * Returns 200 when the application is ready to accept traffic.
   * Used by Kubernetes readiness probe.
   */
  server.get('/health/ready', async (request, reply) => {
    const ready = {
      ready: false,
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        redis: false,
        server: false,
      },
    };

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      ready.checks.database = true;
    } catch (error) {
      console.error('Database readiness check failed:', error);
    }

    try {
      // Check Redis connection
      if (server.fhirQueue) {
        await server.fhirQueue.client.ping();
        ready.checks.redis = true;
      }
    } catch (error) {
      console.error('Redis readiness check failed:', error);
    }

    // Server is always ready if we can handle this request
    ready.checks.server = true;

    // Application is ready if all checks pass
    ready.ready =
      ready.checks.database && ready.checks.redis && ready.checks.server;

    const statusCode = ready.ready ? 200 : 503;
    reply.code(statusCode).send(ready);
  });

  /**
   * GET /health/live
   * Liveness check (Kubernetes)
   *
   * Returns 200 if the application is alive (not deadlocked).
   * Used by Kubernetes liveness probe.
   *
   * This is a simple check - if we can respond, we're alive.
   */
  server.get('/health/live', async (request, reply) => {
    reply.code(200).send({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /health/startup
   * Startup check (Kubernetes)
   *
   * Returns 200 when the application has finished startup.
   * Used by Kubernetes startup probe.
   */
  server.get('/health/startup', async (request, reply) => {
    const startup = {
      started: false,
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        redis: false,
        migrations: false,
      },
    };

    try {
      // Check database is accessible
      await prisma.$queryRaw`SELECT 1`;
      startup.checks.database = true;
    } catch (error) {
      console.error('Database startup check failed:', error);
    }

    try {
      // Check Redis is accessible
      if (server.fhirQueue) {
        await server.fhirQueue.client.ping();
        startup.checks.redis = true;
      }
    } catch (error) {
      console.error('Redis startup check failed:', error);
    }

    // Check migrations have run (check for a known table)
    try {
      await prisma.org.findFirst({ take: 1 });
      startup.checks.migrations = true;
    } catch (error) {
      console.error('Migrations startup check failed:', error);
    }

    // Application has started if all checks pass
    startup.started =
      startup.checks.database &&
      startup.checks.redis &&
      startup.checks.migrations;

    const statusCode = startup.started ? 200 : 503;
    reply.code(statusCode).send(startup);
  });
};

export default monitoringRoutes;

// Extend Fastify type definitions to include fhirQueue
declare module 'fastify' {
  interface FastifyInstance {
    fhirQueue?: any; // BullMQ Queue instance
  }
}
