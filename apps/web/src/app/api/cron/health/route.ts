/**
 * Cron Job Health Monitoring API
 * GET /api/cron/health
 *
 * Provides health metrics for all cron jobs
 * Useful for monitoring dashboards, alerting systems, and ops teams
 *
 * Security:
 * - Requires authentication (session or API key)
 * - Only accessible to admin users
 *
 * Usage:
 *   curl http://localhost:3000/api/cron/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { CronMonitor } from '@/lib/cron/monitoring';
import logger from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/health
 * Returns health metrics for all cron jobs
 */
async function getCronHealth(request: NextRequest) {
  try {
    const monitor = CronMonitor.getInstance();

    // Get health for all jobs
    const allHealth = monitor.getAllJobsHealth();

    // Calculate overall system health
    const healthyJobs = allHealth.filter(h => h.isHealthy).length;
    const totalJobs = allHealth.length;
    const systemHealthy = totalJobs === 0 || healthyJobs === totalJobs;

    // Find jobs with issues
    const criticalJobs = allHealth.filter(h => h.consecutiveFailures >= 3);
    const degradedJobs = allHealth.filter(h => !h.isHealthy && h.consecutiveFailures < 3);

    const response = {
      timestamp: new Date().toISOString(),
      system: {
        healthy: systemHealthy,
        status: systemHealthy ? 'healthy' : (criticalJobs.length > 0 ? 'critical' : 'degraded'),
        totalJobs,
        healthyJobs,
        criticalJobs: criticalJobs.length,
        degradedJobs: degradedJobs.length,
      },
      jobs: allHealth.map(job => ({
        jobName: job.jobName,
        status: job.isHealthy ? 'healthy' : (job.consecutiveFailures >= 3 ? 'critical' : 'degraded'),
        totalRuns: job.totalRuns,
        successfulRuns: job.successfulRuns,
        failedRuns: job.failedRuns,
        successRate: Math.round(job.successRate * 100) / 100,
        consecutiveFailures: job.consecutiveFailures,
        lastRun: job.lastRun?.toISOString(),
        lastSuccess: job.lastSuccess?.toISOString(),
        lastFailure: job.lastFailure?.toISOString(),
        averageDuration: job.averageDuration ? Math.round(job.averageDuration) : null,
      })),
      critical: criticalJobs.map(j => j.jobName),
      degraded: degradedJobs.map(j => j.jobName),
    };

    // Log access
    logger.info({
      event: 'cron_health_check',
      systemHealthy,
      totalJobs,
      criticalJobs: criticalJobs.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error({
      event: 'cron_health_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return safeErrorResponse(error, { userMessage: 'Failed to get cron health' });
  }
}

/**
 * GET /api/cron/health?job=<jobName>
 * Returns detailed health metrics and history for a specific job
 */
async function postCronHealthDetails(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobName, limit = 10 } = body;

    if (!jobName) {
      return NextResponse.json(
        { error: 'jobName is required' },
        { status: 400 }
      );
    }

    const monitor = CronMonitor.getInstance();

    // Get health metrics
    const health = monitor.getJobHealth(jobName);
    if (!health) {
      return NextResponse.json(
        { error: 'Job not found: ${jobName}' },
        { status: 404 }
      );
    }

    // Get execution history
    const history = monitor.getJobHistory(jobName, limit);

    const response = {
      timestamp: new Date().toISOString(),
      job: {
        jobName: health.jobName,
        status: health.isHealthy ? 'healthy' : (health.consecutiveFailures >= 3 ? 'critical' : 'degraded'),
        totalRuns: health.totalRuns,
        successfulRuns: health.successfulRuns,
        failedRuns: health.failedRuns,
        successRate: Math.round(health.successRate * 100) / 100,
        consecutiveFailures: health.consecutiveFailures,
        lastRun: health.lastRun?.toISOString(),
        lastSuccess: health.lastSuccess?.toISOString(),
        lastFailure: health.lastFailure?.toISOString(),
        averageDuration: health.averageDuration ? Math.round(health.averageDuration) : null,
      },
      history: history.map(h => ({
        executionId: h.executionId,
        startTime: h.startTime.toISOString(),
        endTime: h.endTime?.toISOString(),
        duration: h.duration,
        status: h.status,
        retryCount: h.retryCount,
        error: h.error,
        metadata: h.metadata,
      })),
    };

    logger.info({
      event: 'cron_job_details_retrieved',
      jobName,
      historyCount: history.length,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error({
      event: 'cron_job_details_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return safeErrorResponse(error, { userMessage: 'Failed to get job details' });
  }
}

export const GET = createProtectedRoute(getCronHealth, {
  roles: ['ADMIN', 'LICENSE_OWNER'],
  skipCsrf: true,
});

export const POST = createProtectedRoute(postCronHealthDetails, {
  roles: ['ADMIN', 'LICENSE_OWNER'],
});
