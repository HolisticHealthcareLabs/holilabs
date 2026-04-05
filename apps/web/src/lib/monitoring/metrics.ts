/**
 * Structured Metrics for Observability
 *
 * Emits structured JSON to stdout via console.info — compatible with any
 * log aggregator (Grafana Loki, Datadog, CloudWatch, ELK).
 *
 * IMPORTANT: No PHI in any metric. Only tokenized IDs and event types.
 * See CLAUDE.md §V.1 and docs/OBSERVABILITY_PLAN.md.
 */

type AuthEvent =
  | 'login_success'
  | 'login_failure'
  | 'mfa_challenge'
  | 'mfa_success'
  | 'mfa_failure'
  | 'session_expired'
  | 'session_revoked';

type ClinicalEvent =
  | 'cdss_query'
  | 'prescription_signed'
  | 'prescription_rejected'
  | 'soap_saved'
  | 'encounter_started'
  | 'encounter_completed';

type PhiAction = 'read' | 'write' | 'export' | 'delete';

/**
 * Track API request latency — call at the end of request handlers.
 *
 * Maps to observability plan metric: http_request_duration_seconds
 */
export function trackApiLatency(
  route: string,
  method: string,
  statusCode: number,
  durationMs: number,
): void {
  console.info(
    JSON.stringify({
      metric: 'http_request_duration_ms',
      route,
      method,
      statusCode,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Track authentication events for security monitoring.
 *
 * Maps to observability plan metrics:
 * - auth_attempts_total
 * - auth_mfa_challenges_total
 * - session_invalidations_total
 */
export function trackAuthEvent(
  event: AuthEvent,
  meta?: { userId?: string; method?: string; ipHash?: string },
): void {
  console.info(
    JSON.stringify({
      metric: 'auth_event',
      event,
      userId: meta?.userId,
      method: meta?.method,
      ipHash: meta?.ipHash,
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Track clinical workflow events for business metrics.
 *
 * Maps to observability plan metrics:
 * - prescriptions_created_total
 * - encounters_completed_total
 * - ai_inference_duration_seconds
 */
export function trackClinicalEvent(
  event: ClinicalEvent,
  meta?: { workspaceId?: string; encounterId?: string; durationMs?: number },
): void {
  console.info(
    JSON.stringify({
      metric: 'clinical_event',
      event,
      workspaceId: meta?.workspaceId,
      encounterId: meta?.encounterId,
      durationMs: meta?.durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
}

/**
 * Track PHI access for audit correlation.
 *
 * Maps to observability plan metric: phi_access_total
 *
 * IMPORTANT: userId is the accessor's ID, NOT a patient identifier.
 * resourceType is the Prisma model name (e.g. "Patient", "SOAPNote").
 * Never include patient names, MRN, CPF, or any L4 field.
 */
export function trackPhiAccess(
  resourceType: string,
  action: PhiAction,
  userId: string,
  meta?: { accessReason?: string; resourceCount?: number },
): void {
  console.info(
    JSON.stringify({
      metric: 'phi_access',
      resourceType,
      action,
      userId,
      accessReason: meta?.accessReason,
      resourceCount: meta?.resourceCount,
      timestamp: new Date().toISOString(),
    }),
  );
}
