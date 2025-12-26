/**
 * Prometheus Metrics Exporter
 *
 * Production-grade observability with:
 * - Queue health metrics (BullMQ)
 * - FHIR sync health metrics
 * - Reconciliation metrics
 * - Audit mirror metrics
 * - API response time metrics
 * - FHIR operation counters
 *
 * Prometheus format:
 * - Counters: monotonically increasing values
 * - Gauges: can go up/down
 * - Histograms: bucketed observations (e.g., latency)
 * - Summaries: quantiles (p50, p95, p99)
 */

import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';

// ============================================================================
// REGISTRY & DEFAULT METRICS
// ============================================================================

// Create a global registry for all metrics
export const register = new Registry();

// Collect default Node.js metrics (memory, CPU, event loop, etc.)
collectDefaultMetrics({ register, prefix: 'holi_' });

// ============================================================================
// QUEUE METRICS (BullMQ)
// ============================================================================

export const queueJobsActive = new Gauge({
  name: 'holi_queue_jobs_active',
  help: 'Number of active jobs in the queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobsWaiting = new Gauge({
  name: 'holi_queue_jobs_waiting',
  help: 'Number of waiting jobs in the queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobsFailed = new Gauge({
  name: 'holi_queue_jobs_failed',
  help: 'Number of failed jobs in the queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobsCompleted = new Counter({
  name: 'holi_queue_jobs_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobDuration = new Histogram({
  name: 'holi_queue_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue_name', 'job_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120], // 100ms to 2min
  registers: [register],
});

export const queueJobErrors = new Counter({
  name: 'holi_queue_job_errors_total',
  help: 'Total number of job errors',
  labelNames: ['queue_name', 'job_type', 'error_type'],
  registers: [register],
});

// ============================================================================
// FHIR SYNC METRICS
// ============================================================================

export const fhirSyncOperations = new Counter({
  name: 'holi_fhir_sync_operations_total',
  help: 'Total number of FHIR sync operations',
  labelNames: ['resource_type', 'operation', 'status'],
  registers: [register],
});

export const fhirSyncDuration = new Histogram({
  name: 'holi_fhir_sync_duration_seconds',
  help: 'FHIR sync operation duration in seconds',
  labelNames: ['resource_type', 'operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const fhirSyncErrors = new Counter({
  name: 'holi_fhir_sync_errors_total',
  help: 'Total number of FHIR sync errors',
  labelNames: ['resource_type', 'error_type'],
  registers: [register],
});

export const fhirSyncNotSynced = new Gauge({
  name: 'holi_fhir_sync_not_synced',
  help: 'Number of resources that have never been synced',
  labelNames: ['resource_type'],
  registers: [register],
});

export const fhirSyncStale = new Gauge({
  name: 'holi_fhir_sync_stale',
  help: 'Number of resources with stale sync (>1 hour)',
  labelNames: ['resource_type'],
  registers: [register],
});

// ============================================================================
// FHIR RECONCILIATION METRICS
// ============================================================================

export const fhirReconciliationRuns = new Counter({
  name: 'holi_fhir_reconciliation_runs_total',
  help: 'Total number of reconciliation runs',
  labelNames: ['status'],
  registers: [register],
});

export const fhirReconciliationDuration = new Histogram({
  name: 'holi_fhir_reconciliation_duration_seconds',
  help: 'Reconciliation run duration in seconds',
  buckets: [1, 5, 10, 30, 60, 120, 300], // 1s to 5min
  registers: [register],
});

export const fhirReconciliationEnqueued = new Counter({
  name: 'holi_fhir_reconciliation_enqueued_total',
  help: 'Total number of resources enqueued for reconciliation',
  labelNames: ['resource_type'],
  registers: [register],
});

export const fhirReconciliationErrors = new Counter({
  name: 'holi_fhir_reconciliation_errors_total',
  help: 'Total number of reconciliation errors',
  labelNames: ['error_type'],
  registers: [register],
});

// ============================================================================
// AUDIT MIRROR METRICS
// ============================================================================

export const fhirAuditMirrorRuns = new Counter({
  name: 'holi_fhir_audit_mirror_runs_total',
  help: 'Total number of audit mirror runs',
  labelNames: ['status'],
  registers: [register],
});

export const fhirAuditMirrorDuration = new Histogram({
  name: 'holi_fhir_audit_mirror_duration_seconds',
  help: 'Audit mirror run duration in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const fhirAuditMirrorEvents = new Counter({
  name: 'holi_fhir_audit_mirror_events_total',
  help: 'Total number of audit events processed',
  labelNames: ['status'], // mirrored, skipped, error
  registers: [register],
});

// ============================================================================
// API METRICS
// ============================================================================

export const httpRequestDuration = new Histogram({
  name: 'holi_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5], // 10ms to 5s
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: 'holi_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'holi_http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
  registers: [register],
});

// ============================================================================
// FHIR OPERATION METRICS
// ============================================================================

export const fhirOperations = new Counter({
  name: 'holi_fhir_operations_total',
  help: 'Total number of FHIR operations',
  labelNames: ['operation', 'resource_type', 'status'],
  registers: [register],
});

export const fhirOperationDuration = new Histogram({
  name: 'holi_fhir_operation_duration_seconds',
  help: 'FHIR operation duration in seconds',
  labelNames: ['operation', 'resource_type'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// ============================================================================
// HIPAA AUDIT METRICS
// ============================================================================

export const hipaaAuditEvents = new Counter({
  name: 'holi_hipaa_audit_events_total',
  help: 'Total number of HIPAA audit events',
  labelNames: ['event_type', 'org_id'],
  registers: [register],
});

export const hipaaPhiAccess = new Counter({
  name: 'holi_hipaa_phi_access_total',
  help: 'Total number of PHI access events',
  labelNames: ['user_role', 'access_type', 'org_id'],
  registers: [register],
});

export const hipaaConsentValidations = new Counter({
  name: 'holi_hipaa_consent_validations_total',
  help: 'Total number of consent validations',
  labelNames: ['status', 'org_id'], // granted, denied, missing
  registers: [register],
});

// ============================================================================
// DATABASE METRICS
// ============================================================================

export const databaseConnectionsActive = new Gauge({
  name: 'holi_database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const databaseQueryDuration = new Histogram({
  name: 'holi_database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['model', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
  registers: [register],
});

export const databaseErrors = new Counter({
  name: 'holi_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['model', 'error_type'],
  registers: [register],
});

// ============================================================================
// METRICS COLLECTION FUNCTIONS
// ============================================================================

/**
 * Collect queue metrics from BullMQ
 */
export async function collectQueueMetrics(queue: Queue): Promise<void> {
  try {
    const [active, waiting, failed] = await Promise.all([
      queue.getActiveCount(),
      queue.getWaitingCount(),
      queue.getFailedCount(),
    ]);

    const queueName = queue.name;

    queueJobsActive.set({ queue_name: queueName }, active);
    queueJobsWaiting.set({ queue_name: queueName }, waiting);
    queueJobsFailed.set({ queue_name: queueName }, failed);
  } catch (error) {
    console.error('Failed to collect queue metrics:', error);
  }
}

/**
 * Collect FHIR sync health metrics
 */
export async function collectFhirSyncMetrics(prisma: PrismaClient): Promise<void> {
  try {
    // Count encounters never synced
    const encountersNotSynced = await prisma.encounter.count({
      where: { lastSyncedToFhir: null },
    });
    fhirSyncNotSynced.set({ resource_type: 'Encounter' }, encountersNotSynced);

    // Count observations never synced
    const observationsNotSynced = await prisma.observation.count({
      where: { lastSyncedToFhir: null },
    });
    fhirSyncNotSynced.set({ resource_type: 'Observation' }, observationsNotSynced);

    // Count encounters with stale sync (>1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const encountersStale = await prisma.encounter.count({
      where: {
        lastSyncedToFhir: { lt: oneHourAgo },
        updatedAt: { gt: oneHourAgo },
      },
    });
    fhirSyncStale.set({ resource_type: 'Encounter' }, encountersStale);

    // Count observations with stale sync
    const observationsStale = await prisma.observation.count({
      where: {
        lastSyncedToFhir: { lt: oneHourAgo },
        updatedAt: { gt: oneHourAgo },
      },
    });
    fhirSyncStale.set({ resource_type: 'Observation' }, observationsStale);
  } catch (error) {
    console.error('Failed to collect FHIR sync metrics:', error);
  }
}

/**
 * Collect database connection metrics
 */
export async function collectDatabaseMetrics(prisma: PrismaClient): Promise<void> {
  try {
    // Query Prisma pool size (if using connection pooling)
    // This is a placeholder - actual implementation depends on your Prisma setup
    const result = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database();
    `;

    const activeConnections = Number(result[0]?.count || 0);
    databaseConnectionsActive.set(activeConnections);
  } catch (error) {
    console.error('Failed to collect database metrics:', error);
  }
}

/**
 * Collect all metrics (called periodically)
 */
export async function collectAllMetrics(
  queue: Queue,
  prisma: PrismaClient
): Promise<void> {
  await Promise.allSettled([
    collectQueueMetrics(queue),
    collectFhirSyncMetrics(prisma),
    collectDatabaseMetrics(prisma),
  ]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Record FHIR sync operation
 */
export function recordFhirSync(
  resourceType: string,
  operation: string,
  status: 'success' | 'failure',
  durationMs: number
): void {
  fhirSyncOperations.inc({ resource_type: resourceType, operation, status });
  fhirSyncDuration.observe(
    { resource_type: resourceType, operation },
    durationMs / 1000
  );
}

/**
 * Record FHIR sync error
 */
export function recordFhirSyncError(
  resourceType: string,
  errorType: string
): void {
  fhirSyncErrors.inc({ resource_type: resourceType, error_type: errorType });
}

/**
 * Record reconciliation run
 */
export function recordReconciliationRun(
  status: 'success' | 'failure',
  durationMs: number,
  encountersEnqueued: number,
  observationsEnqueued: number
): void {
  fhirReconciliationRuns.inc({ status });
  fhirReconciliationDuration.observe(durationMs / 1000);
  fhirReconciliationEnqueued.inc(
    { resource_type: 'Encounter' },
    encountersEnqueued
  );
  fhirReconciliationEnqueued.inc(
    { resource_type: 'Observation' },
    observationsEnqueued
  );
}

/**
 * Record audit mirror run
 */
export function recordAuditMirrorRun(
  status: 'success' | 'failure',
  durationMs: number,
  mirrored: number,
  skipped: number,
  errors: number
): void {
  fhirAuditMirrorRuns.inc({ status });
  fhirAuditMirrorDuration.observe(durationMs / 1000);
  fhirAuditMirrorEvents.inc({ status: 'mirrored' }, mirrored);
  fhirAuditMirrorEvents.inc({ status: 'skipped' }, skipped);
  fhirAuditMirrorEvents.inc({ status: 'error' }, errors);
}

/**
 * Record HTTP request
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationMs: number
): void {
  httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe(
    { method, route, status_code: statusCode.toString() },
    durationMs / 1000
  );
}

/**
 * Record FHIR operation
 */
export function recordFhirOperation(
  operation: string,
  resourceType: string,
  status: 'success' | 'failure',
  durationMs: number
): void {
  fhirOperations.inc({ operation, resource_type: resourceType, status });
  fhirOperationDuration.observe(
    { operation, resource_type: resourceType },
    durationMs / 1000
  );
}

/**
 * Record HIPAA audit event
 */
export function recordHipaaAuditEvent(eventType: string, orgId: string): void {
  hipaaAuditEvents.inc({ event_type: eventType, org_id: orgId });
}

/**
 * Record PHI access
 */
export function recordPhiAccess(
  userRole: string,
  accessType: string,
  orgId: string
): void {
  hipaaPhiAccess.inc({ user_role: userRole, access_type: accessType, org_id: orgId });
}

/**
 * Record consent validation
 */
export function recordConsentValidation(
  status: 'granted' | 'denied' | 'missing',
  orgId: string
): void {
  hipaaConsentValidations.inc({ status, org_id: orgId });
}

/**
 * Export metrics in Prometheus format
 */
export async function exportMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Export metrics in JSON format (for debugging)
 */
export async function exportMetricsJson(): Promise<any> {
  return register.getMetricsAsJSON();
}
