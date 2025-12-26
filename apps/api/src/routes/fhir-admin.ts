/**
 * FHIR Admin Routes
 * Administrative endpoints for FHIR sync monitoring and management
 */

import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../index';
import {
  getQueueStats,
  getFailedJobs,
  retryFailedJob,
  cleanOldJobs,
  pauseQueue,
  resumeQueue,
} from '../services/fhir-queue';
import {
  runReconciliation,
  getReconciliationStats,
  getReconciliationHistory,
} from '../services/fhir-reconciliation';
import {
  runAuditMirror,
  getAuditMirrorStats,
  searchMirroredAuditEvents,
} from '../services/fhir-audit-mirror';
import { bulkSyncEncounters, bulkSyncObservations } from '../lib/prisma-fhir-middleware';

/**
 * Authentication middleware (placeholder - implement proper RBAC)
 */
async function authenticateAdmin(request: any): Promise<{ userId: string; orgId: string }> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  // TODO: Implement proper JWT validation and ADMIN role check
  const userId = request.headers['x-user-id'];
  const orgId = request.headers['x-org-id'];

  if (!userId || !orgId) {
    throw new Error('Missing user or org context');
  }

  return { userId, orgId };
}

/**
 * Verify CRON secret for automated jobs
 */
function verifyCronSecret(request: any): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false; // No secret configured - allow in dev, block in prod
  }

  const providedSecret = request.headers['x-cron-secret'];
  return providedSecret === cronSecret;
}

const fhirAdminRoutes: FastifyPluginAsync = async (server) => {
  /**
   * Health check
   */
  server.get('/health', async () => {
    return { status: 'ok', service: 'fhir-admin' };
  });

  /**
   * Get queue statistics
   */
  server.get('/queue/stats', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const stats = await getQueueStats();
      return reply.send({
        success: true,
        stats,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Get failed jobs
   */
  server.get('/queue/failed', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const limit = parseInt((request.query as any).limit || '50', 10);
      const jobs = await getFailedJobs(limit);

      return reply.send({
        success: true,
        count: jobs.length,
        jobs: jobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        })),
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Retry a failed job
   */
  server.post('/queue/retry/:jobId', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const { jobId } = request.params as { jobId: string };
      await retryFailedJob(jobId);

      return reply.send({
        success: true,
        message: `Job ${jobId} retried`,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Clean old jobs
   */
  server.post('/queue/clean', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      await cleanOldJobs();

      return reply.send({
        success: true,
        message: 'Old jobs cleaned',
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Pause queue
   */
  server.post('/queue/pause', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      await pauseQueue();

      return reply.send({
        success: true,
        message: 'Queue paused',
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Resume queue
   */
  server.post('/queue/resume', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      await resumeQueue();

      return reply.send({
        success: true,
        message: 'Queue resumed',
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Get reconciliation statistics
   */
  server.get('/reconciliation/stats', async (request, reply) => {
    try {
      const { orgId } = await authenticateAdmin(request);

      const stats = await getReconciliationStats(prisma, orgId);

      return reply.send({
        success: true,
        stats,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Get reconciliation history
   */
  server.get('/reconciliation/history', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const limit = parseInt((request.query as any).limit || '10', 10);
      const history = await getReconciliationHistory(prisma, limit);

      return reply.send({
        success: true,
        count: history.length,
        history,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Run reconciliation manually
   */
  server.post('/reconciliation/run', async (request, reply) => {
    try {
      const { orgId } = await authenticateAdmin(request);

      const body = request.body as any;
      const options = {
        orgId: body.orgId || orgId,
        batchSize: body.batchSize || 1000,
        staleDays: body.staleDays || 1,
      };

      const result = await runReconciliation(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Run reconciliation via CRON (secured with CRON_SECRET)
   */
  server.post('/reconciliation/cron', async (request, reply) => {
    try {
      if (!verifyCronSecret(request)) {
        return reply.code(403).send({
          success: false,
          error: 'Invalid or missing CRON secret',
        });
      }

      const body = request.body as any;
      const options = {
        orgId: body.orgId,
        batchSize: body.batchSize || 1000,
        staleDays: body.staleDays || 1,
      };

      const result = await runReconciliation(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Bulk sync encounters (for initial migration)
   */
  server.post('/bulk-sync/encounters', async (request, reply) => {
    try {
      const { orgId } = await authenticateAdmin(request);

      const body = request.body as any;
      const options = {
        orgId: body.orgId || orgId,
        onlyNotSynced: body.onlyNotSynced !== false,
        limit: body.limit || 1000,
      };

      const result = await bulkSyncEncounters(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Bulk sync observations (for initial migration)
   */
  server.post('/bulk-sync/observations', async (request, reply) => {
    try {
      const { orgId } = await authenticateAdmin(request);

      const body = request.body as any;
      const options = {
        orgId: body.orgId || orgId,
        onlyNotSynced: body.onlyNotSynced !== false,
        limit: body.limit || 1000,
      };

      const result = await bulkSyncObservations(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Get audit mirror statistics
   */
  server.get('/audit-mirror/stats', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const stats = await getAuditMirrorStats(prisma);

      return reply.send({
        success: true,
        stats,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Run audit mirror manually
   */
  server.post('/audit-mirror/run', async (request, reply) => {
    try {
      await authenticateAdmin(request);

      const body = request.body as any;
      const options = {
        limit: body.limit || 1000,
        forceSince: body.forceSince ? new Date(body.forceSince) : undefined,
      };

      const result = await runAuditMirror(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Run audit mirror via CRON (secured with CRON_SECRET)
   */
  server.post('/audit-mirror/cron', async (request, reply) => {
    try {
      if (!verifyCronSecret(request)) {
        return reply.code(403).send({
          success: false,
          error: 'Invalid or missing CRON secret',
        });
      }

      const body = request.body as any;
      const options = {
        limit: body.limit || 1000,
        forceSince: body.forceSince ? new Date(body.forceSince) : undefined,
      };

      const result = await runAuditMirror(prisma, options);

      return reply.send({
        success: true,
        result,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });

  /**
   * Search mirrored audit events
   */
  server.get('/audit-mirror/search', async (request, reply) => {
    try {
      const { orgId } = await authenticateAdmin(request);

      const query = request.query as any;
      const options = {
        orgId: query.orgId || orgId,
        eventTypes: query.eventTypes ? query.eventTypes.split(',') : undefined,
        since: query.since ? new Date(query.since) : undefined,
        until: query.until ? new Date(query.until) : undefined,
        agentReference: query.agentReference,
        entityReference: query.entityReference,
        limit: query.limit ? parseInt(query.limit, 10) : 100,
      };

      const events = await searchMirroredAuditEvents(prisma, options);

      return reply.send({
        success: true,
        count: events.length,
        events,
      });
    } catch (error) {
      server.log.error(error);
      return reply.code(500).send({
        success: false,
        error: (error as Error).message,
      });
    }
  });
};

export default fhirAdminRoutes;
