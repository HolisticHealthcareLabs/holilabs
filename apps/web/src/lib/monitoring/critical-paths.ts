/**
 * Critical Path Monitoring
 *
 * Tracks performance and success rates of critical healthcare workflows:
 * - CDSS evaluations
 * - Prescription approvals
 * - Patient data access
 * - Authentication
 *
 * Usage:
 *   import { monitorCriticalPath } from '@/lib/monitoring/critical-paths';
 *
 *   await monitorCriticalPath('cdss_evaluation', async () => {
 *     // Your critical operation
 *     return await cdss.evaluate(context);
 *   }, { patientId: 'pat_123' });
 */

import { logger, logPerformance } from '@/lib/logger';

/**
 * Critical path identifiers
 */
export type CriticalPath =
  | 'cdss_evaluation'
  | 'prescription_approval'
  | 'prescription_send_pharmacy'
  | 'patient_record_access'
  | 'patient_search'
  | 'authentication_login'
  | 'authentication_logout'
  | 'ai_insight_generation'
  | 'review_queue_processing'
  | 'appointment_scheduling'
  | 'file_upload'
  | 'notification_delivery';

/**
 * Performance thresholds by critical path (in milliseconds)
 */
const PERFORMANCE_THRESHOLDS: Record<CriticalPath, {
  target: number;
  warning: number;
  critical: number;
}> = {
  cdss_evaluation: {
    target: 2000,    // 2 seconds
    warning: 3000,   // 3 seconds
    critical: 5000,  // 5 seconds
  },
  prescription_approval: {
    target: 10000,   // 10 seconds
    warning: 20000,  // 20 seconds
    critical: 30000, // 30 seconds (e-prescribing SLA)
  },
  prescription_send_pharmacy: {
    target: 5000,    // 5 seconds
    warning: 10000,  // 10 seconds
    critical: 30000, // 30 seconds
  },
  patient_record_access: {
    target: 1000,    // 1 second
    warning: 2000,   // 2 seconds
    critical: 3000,  // 3 seconds
  },
  patient_search: {
    target: 500,     // 500ms
    warning: 1000,   // 1 second
    critical: 2000,  // 2 seconds
  },
  authentication_login: {
    target: 1000,    // 1 second
    warning: 2000,   // 2 seconds
    critical: 5000,  // 5 seconds
  },
  authentication_logout: {
    target: 500,     // 500ms
    warning: 1000,   // 1 second
    critical: 2000,  // 2 seconds
  },
  ai_insight_generation: {
    target: 5000,    // 5 seconds
    warning: 10000,  // 10 seconds
    critical: 15000, // 15 seconds
  },
  review_queue_processing: {
    target: 2000,    // 2 seconds
    warning: 5000,   // 5 seconds
    critical: 10000, // 10 seconds
  },
  appointment_scheduling: {
    target: 1000,    // 1 second
    warning: 2000,   // 2 seconds
    critical: 5000,  // 5 seconds
  },
  file_upload: {
    target: 5000,    // 5 seconds
    warning: 10000,  // 10 seconds
    critical: 30000, // 30 seconds
  },
  notification_delivery: {
    target: 2000,    // 2 seconds
    warning: 5000,   // 5 seconds
    critical: 10000, // 10 seconds
  },
};

/**
 * Critical path metadata for logging context
 */
interface CriticalPathMetadata {
  userId?: string;
  patientId?: string;
  appointmentId?: string;
  prescriptionId?: string;
  [key: string]: any;
}

/**
 * Critical path result
 */
interface CriticalPathResult<T> {
  success: boolean;
  duration: number;
  data?: T;
  error?: Error;
  performanceLevel: 'target' | 'warning' | 'critical' | 'exceeded';
}

/**
 * Monitor a critical path operation
 *
 * Automatically tracks:
 * - Execution time
 * - Success/failure
 * - Performance level (target/warning/critical)
 * - Logs with appropriate severity
 *
 * @param path - Critical path identifier
 * @param operation - Async operation to monitor
 * @param metadata - Additional context for logging
 * @returns Result with performance data
 */
export async function monitorCriticalPath<T>(
  path: CriticalPath,
  operation: () => Promise<T>,
  metadata: CriticalPathMetadata = {}
): Promise<CriticalPathResult<T>> {
  const startTime = Date.now();
  const thresholds = PERFORMANCE_THRESHOLDS[path];

  try {
    // Execute the operation
    const data = await operation();
    const duration = Date.now() - startTime;

    // Determine performance level
    const performanceLevel = getPerformanceLevel(duration, thresholds);

    // Log success with appropriate severity based on performance
    const logLevel = performanceLevel === 'exceeded' || performanceLevel === 'critical'
      ? 'warn'
      : 'info';

    logger[logLevel]({
      event: `${path}_completed`,
      duration,
      performanceLevel,
      target: thresholds.target,
      warning: thresholds.warning,
      critical: thresholds.critical,
      ...metadata,
    }, `Critical path completed: ${path}`);

    // Track metrics for aggregation
    trackCriticalPathMetric(path, duration, true, performanceLevel);

    return {
      success: true,
      duration,
      data,
      performanceLevel,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const performanceLevel = getPerformanceLevel(duration, thresholds);

    // Log error
    logger.error({
      event: `${path}_failed`,
      duration,
      performanceLevel,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ...metadata,
    }, `Critical path failed: ${path}`);

    // Track failure metric
    trackCriticalPathMetric(path, duration, false, performanceLevel);

    return {
      success: false,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
      performanceLevel,
    };
  }
}

/**
 * Determine performance level based on duration and thresholds
 */
function getPerformanceLevel(
  duration: number,
  thresholds: { target: number; warning: number; critical: number }
): 'target' | 'warning' | 'critical' | 'exceeded' {
  if (duration <= thresholds.target) return 'target';
  if (duration <= thresholds.warning) return 'warning';
  if (duration <= thresholds.critical) return 'critical';
  return 'exceeded';
}

/**
 * Track critical path metrics for aggregation
 * This can be extended to push to a metrics service (Prometheus, DataDog, etc.)
 */
function trackCriticalPathMetric(
  path: CriticalPath,
  duration: number,
  success: boolean,
  performanceLevel: string
): void {
  // For now, just log the metric
  // TODO: Push to metrics service (Prometheus, DataDog, CloudWatch, etc.)
  logger.debug({
    event: 'critical_path_metric',
    path,
    duration,
    success,
    performanceLevel,
    timestamp: Date.now(),
  });

  // Example: Push to Prometheus (if configured)
  // prometheusClient.histogram('critical_path_duration', duration, { path, success });
  // prometheusClient.counter('critical_path_total', 1, { path, success });
}

/**
 * CDSS Evaluation Monitoring
 */
export async function monitorCDSSEvaluation<T>(
  operation: () => Promise<T>,
  metadata: { patientId: string; userId: string; ruleCount?: number }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('cdss_evaluation', operation, metadata);
}

/**
 * Prescription Approval Monitoring
 */
export async function monitorPrescriptionApproval<T>(
  operation: () => Promise<T>,
  metadata: { prescriptionId: string; patientId: string; userId: string }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('prescription_approval', operation, metadata);
}

/**
 * Patient Data Access Monitoring
 */
export async function monitorPatientAccess<T>(
  operation: () => Promise<T>,
  metadata: { patientId: string; userId: string; accessType: string }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('patient_record_access', operation, metadata);
}

/**
 * Authentication Monitoring
 */
export async function monitorAuthentication<T>(
  operation: () => Promise<T>,
  metadata: { userId?: string; email?: string; method: 'password' | 'magic-link' | 'otp' }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('authentication_login', operation, metadata);
}

/**
 * AI Insight Generation Monitoring
 */
export async function monitorAIInsights<T>(
  operation: () => Promise<T>,
  metadata: { userId: string; patientCount: number; insightTypes?: string[] }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('ai_insight_generation', operation, metadata);
}

/**
 * Review Queue Processing Monitoring
 */
export async function monitorReviewQueue<T>(
  operation: () => Promise<T>,
  metadata: { queueItemId: string; userId: string; action: 'approve' | 'reject' }
): Promise<CriticalPathResult<T>> {
  return monitorCriticalPath('review_queue_processing', operation, metadata);
}

/**
 * Get critical path metrics summary
 * This can be exposed via an API endpoint for monitoring dashboards
 */
export interface CriticalPathMetrics {
  path: CriticalPath;
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  targetMet: number;
  warningLevel: number;
  criticalLevel: number;
  exceeded: number;
}

/**
 * In-memory metrics storage (for demonstration)
 * In production, this should be replaced with a proper metrics backend
 */
const metricsStore = new Map<CriticalPath, {
  executions: Array<{ duration: number; success: boolean; timestamp: number }>;
}>();

/**
 * Calculate metrics for a critical path
 */
export function getCriticalPathMetrics(path: CriticalPath): CriticalPathMetrics | null {
  const data = metricsStore.get(path);
  if (!data || data.executions.length === 0) {
    return null;
  }

  const executions = data.executions;
  const durations = executions.map(e => e.duration).sort((a, b) => a - b);
  const thresholds = PERFORMANCE_THRESHOLDS[path];

  const totalExecutions = executions.length;
  const successCount = executions.filter(e => e.success).length;
  const successRate = (successCount / totalExecutions) * 100;

  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p50Duration = durations[Math.floor(durations.length * 0.5)];
  const p95Duration = durations[Math.floor(durations.length * 0.95)];
  const p99Duration = durations[Math.floor(durations.length * 0.99)];

  const targetMet = durations.filter(d => d <= thresholds.target).length;
  const warningLevel = durations.filter(d => d > thresholds.target && d <= thresholds.warning).length;
  const criticalLevel = durations.filter(d => d > thresholds.warning && d <= thresholds.critical).length;
  const exceeded = durations.filter(d => d > thresholds.critical).length;

  return {
    path,
    totalExecutions,
    successRate,
    averageDuration,
    p50Duration,
    p95Duration,
    p99Duration,
    targetMet,
    warningLevel,
    criticalLevel,
    exceeded,
  };
}

/**
 * Get all critical path metrics
 */
export function getAllCriticalPathMetrics(): CriticalPathMetrics[] {
  const paths: CriticalPath[] = [
    'cdss_evaluation',
    'prescription_approval',
    'prescription_send_pharmacy',
    'patient_record_access',
    'patient_search',
    'authentication_login',
    'authentication_logout',
    'ai_insight_generation',
    'review_queue_processing',
    'appointment_scheduling',
    'file_upload',
    'notification_delivery',
  ];

  return paths
    .map(path => getCriticalPathMetrics(path))
    .filter((metrics): metrics is CriticalPathMetrics => metrics !== null);
}

/**
 * Clear metrics (useful for testing)
 */
export function clearCriticalPathMetrics(): void {
  metricsStore.clear();
}

/**
 * Example usage in an API route:
 *
 * // /api/cds/evaluate
 * import { monitorCDSSEvaluation } from '@/lib/monitoring/critical-paths';
 *
 * export async function POST(request: Request) {
 *   const result = await monitorCDSSEvaluation(
 *     async () => {
 *       // Your CDSS evaluation logic
 *       return await cdsEngine.evaluate(context);
 *     },
 *     {
 *       patientId: patient.id,
 *       userId: user.id,
 *       ruleCount: rules.length,
 *     }
 *   );
 *
 *   if (!result.success) {
 *     return NextResponse.json(
 *       { error: result.error?.message },
 *       { status: 500 }
 *     );
 *   }
 *
 *   return NextResponse.json(result.data);
 * }
 */

/**
 * Simplified monitoring for quick checks
 * Use when you only care about duration, not full result handling
 */
export async function trackCriticalPathDuration(
  path: CriticalPath,
  metadata: CriticalPathMetadata = {}
): Promise<{ stop: () => void }> {
  const startTime = Date.now();

  return {
    stop: () => {
      const duration = Date.now() - startTime;
      const thresholds = PERFORMANCE_THRESHOLDS[path];
      const performanceLevel = getPerformanceLevel(duration, thresholds);

      logger.info({
        event: `${path}_duration`,
        duration,
        performanceLevel,
        ...metadata,
      });

      trackCriticalPathMetric(path, duration, true, performanceLevel);
    },
  };
}

/**
 * Example usage with trackCriticalPathDuration:
 *
 * const timer = await trackCriticalPathDuration('patient_search', { userId: user.id });
 * // ... perform search operation ...
 * timer.stop();
 */

/**
 * Critical Path Health Check
 * Returns overall health status of critical paths
 */
export interface CriticalPathHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  totalPaths: number;
  healthyPaths: number;
  degradedPaths: number;
  unhealthyPaths: number;
  details: Array<{
    path: CriticalPath;
    status: 'healthy' | 'degraded' | 'unhealthy';
    reason?: string;
  }>;
}

export function getCriticalPathHealth(): CriticalPathHealth {
  const allMetrics = getAllCriticalPathMetrics();

  if (allMetrics.length === 0) {
    return {
      status: 'healthy',
      totalPaths: 0,
      healthyPaths: 0,
      degradedPaths: 0,
      unhealthyPaths: 0,
      details: [],
    };
  }

  const details = allMetrics.map(metrics => {
    // Unhealthy if success rate < 95% or p95 exceeds critical threshold
    if (metrics.successRate < 95 || metrics.p95Duration > PERFORMANCE_THRESHOLDS[metrics.path].critical) {
      return {
        path: metrics.path,
        status: 'unhealthy' as const,
        reason: metrics.successRate < 95
          ? `Low success rate: ${metrics.successRate.toFixed(1)}%`
          : `High p95 latency: ${metrics.p95Duration}ms`,
      };
    }

    // Degraded if success rate < 98% or p95 exceeds warning threshold
    if (metrics.successRate < 98 || metrics.p95Duration > PERFORMANCE_THRESHOLDS[metrics.path].warning) {
      return {
        path: metrics.path,
        status: 'degraded' as const,
        reason: metrics.successRate < 98
          ? `Reduced success rate: ${metrics.successRate.toFixed(1)}%`
          : `Elevated p95 latency: ${metrics.p95Duration}ms`,
      };
    }

    return {
      path: metrics.path,
      status: 'healthy' as const,
    };
  });

  const healthyPaths = details.filter(d => d.status === 'healthy').length;
  const degradedPaths = details.filter(d => d.status === 'degraded').length;
  const unhealthyPaths = details.filter(d => d.status === 'unhealthy').length;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyPaths > 0) {
    overallStatus = 'unhealthy';
  } else if (degradedPaths > 0) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  return {
    status: overallStatus,
    totalPaths: allMetrics.length,
    healthyPaths,
    degradedPaths,
    unhealthyPaths,
    details,
  };
}

/**
 * Export for API endpoint
 * Create GET /api/monitoring/critical-paths to expose these metrics
 */
export const criticalPathMonitoring = {
  monitorCriticalPath,
  monitorCDSSEvaluation,
  monitorPrescriptionApproval,
  monitorPatientAccess,
  monitorAuthentication,
  monitorAIInsights,
  monitorReviewQueue,
  getCriticalPathMetrics,
  getAllCriticalPathMetrics,
  getCriticalPathHealth,
  clearCriticalPathMetrics,
  trackCriticalPathDuration,
};

export default criticalPathMonitoring;
