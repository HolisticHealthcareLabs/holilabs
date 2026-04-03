/**
 * Pre-Built Middleware Implementations
 *
 * Thin, composable wrappers around HoliLabs' existing security primitives.
 * Each middleware receives injectable dependencies so shared-kernel stays
 * free of app-layer imports (prisma, Redis, etc.).
 *
 * Execution order (by priority):
 *   PRE:  RBAC(10) → Consent(20) → DeId(30)
 *   POST: Audit(10) → Cost(20)
 *
 * RUTH:  RVI-006 — No LLM call with unstripped PII (mandatory de-id).
 * CYRUS: CVI-001 — Every route uses RBAC guard.
 *        CVI-004 — AuditLog append-only.
 *        CVI-005 — Hash-chain integrity preserved.
 * ELENA: EVI-003 — Agent loop routes tool calls, not clinical decisions.
 */

import type {
  ToolMiddleware,
  ToolContext,
  MiddlewareResult,
  TenantContext,
} from './types';

// ─── Dependency Injection Interfaces ────────────────────────────────────────
// These map to existing app-layer functions. The middleware factory accepts
// them as parameters so shared-kernel has no direct dependency on prisma/Redis.

export interface RBACChecker {
  checkPermission(
    roles: string[],
    requiredPermissions: string[],
  ): { allowed: boolean; missing: string[] };
}

export interface ConsentVerifier {
  verifyConsent(
    patientId: string,
    consentType: string,
    emergencyOverride?: boolean,
    emergencyJustification?: string,
  ): Promise<{ granted: boolean; reason?: string }>;
}

export interface DeIdentifier {
  deidentify(
    input: Record<string, unknown>,
    toolName: string,
  ): Promise<Record<string, unknown>>;
}

export interface AuditWriter {
  writeEntry(params: {
    action: string;
    resourceType: string;
    resourceId: string;
    userId: string;
    actorType: 'AGENT' | 'USER';
    agentId: string;
    toolName: string;
    success: boolean;
    accessReason: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface CostTracker {
  recordToolUsage(params: {
    toolName: string;
    organizationId: string;
    agentId: string;
    success: boolean;
    executionTimeMs: number;
  }): Promise<void>;
}

// ─── Tool Permission Registry ───────────────────────────────────────────────

/** Maps tool names to their required RBAC permissions. */
export type ToolPermissionMap = Record<string, string[]>;

/** Maps tool categories to consent types. */
export type ToolConsentMap = Record<string, string>;

// ─── RBAC Middleware (Pre-Phase, Priority 10) ───────────────────────────────

export function createRBACMiddleware(
  checker: RBACChecker,
  toolPermissions: ToolPermissionMap,
): ToolMiddleware {
  return {
    phase: 'pre',
    name: 'rbac',
    priority: 10,
    async handler(context: ToolContext): Promise<MiddlewareResult> {
      const requiredPerms = toolPermissions[context.toolCall.name];

      // Tools without explicit permissions are allowed (administrative/read-only)
      if (!requiredPerms || requiredPerms.length === 0) {
        return { blocked: false };
      }

      const roles = context.request.tenantContext?.roles ?? [];
      const result = checker.checkPermission(roles, requiredPerms);

      if (!result.allowed) {
        const roleStr = roles.join(', ') || 'none';
        return {
          blocked: true,
          reason: `RBAC: Roles [${roleStr}] lack permissions [${result.missing.join(', ')}] for tool ${context.toolCall.name}`,
          suggestion: suggestEscalation(result.missing),
        };
      }

      return { blocked: false };
    },
  };
}

function suggestEscalation(missingPermissions: string[]): string {
  const hasClinical = missingPermissions.some(p =>
    p.includes('prescribe') || p.includes('diagnose') || p.includes('clinical'),
  );

  if (hasClinical) {
    return 'Request a CLINICIAN or PHYSICIAN to perform this action via the escalation tool.';
  }

  const hasAdmin = missingPermissions.some(p =>
    p.includes('admin') || p.includes('manage') || p.includes('delete'),
  );

  if (hasAdmin) {
    return 'This action requires ADMIN privileges. Contact your workspace administrator.';
  }

  return 'Insufficient permissions. Request escalation through the appropriate role.';
}

// ─── Consent Middleware (Pre-Phase, Priority 20) ────────────────────────────

export function createConsentMiddleware(
  verifier: ConsentVerifier,
  toolConsentMap: ToolConsentMap,
): ToolMiddleware {
  return {
    phase: 'pre',
    name: 'consent',
    priority: 20,
    async handler(context: ToolContext): Promise<MiddlewareResult> {
      const consentType = toolConsentMap[context.toolCall.name];

      // Tools without consent mapping don't require patient consent
      if (!consentType) {
        return { blocked: false };
      }

      // Extract patientId from tool input
      const input = context.toolCall.input;
      const patientId = (input.patientId ?? input.patient_id ?? input.id) as string | undefined;

      if (!patientId) {
        // No patient context — skip consent check (list/search operations)
        return { blocked: false };
      }

      const tenant = context.request.tenantContext;
      const result = await verifier.verifyConsent(
        patientId,
        consentType,
        tenant?.emergencyOverride,
        tenant?.emergencyJustification,
      );

      if (!result.granted) {
        return {
          blocked: true,
          reason: `LGPD_CONSENT_DENIED: Patient ${patientId} has not granted ${consentType} consent. ${result.reason ?? ''}`.trim(),
          suggestion: 'Request consent from the patient before accessing their data, or use emergency break-glass if clinically justified.',
        };
      }

      return { blocked: false };
    },
  };
}

// ─── De-Identification Middleware (Pre-Phase, Priority 30) ──────────────────

/**
 * Strips PII from tool inputs before execution.
 * RUTH: RVI-006 — No LLM call with unstripped PII.
 *
 * Only applies to tools marked as requiring de-identification
 * (typically external-facing tools, LLM-routed tools).
 */
export function createDeIdMiddleware(
  deidentifier: DeIdentifier,
  toolsRequiringDeId: Set<string>,
): ToolMiddleware {
  return {
    phase: 'pre',
    name: 'deid',
    priority: 30,
    async handler(context: ToolContext): Promise<MiddlewareResult> {
      if (!toolsRequiringDeId.has(context.toolCall.name)) {
        return { blocked: false };
      }

      try {
        const sanitizedInput = await deidentifier.deidentify(
          context.toolCall.input,
          context.toolCall.name,
        );
        return { blocked: false, mutatedInput: sanitizedInput };
      } catch (error) {
        // De-id failure is a hard block — we MUST NOT forward PII
        const msg = error instanceof Error ? error.message : 'De-identification failed';
        return {
          blocked: true,
          reason: `DE_ID_FAILED: ${msg}`,
          suggestion: 'De-identification is mandatory for this tool. Check the input for unsupported data formats.',
        };
      }
    },
  };
}

// ─── Audit Middleware (Post-Phase, Priority 10) ─────────────────────────────

/**
 * Writes immutable audit trail entry after every tool execution.
 * CYRUS: CVI-004 — Append-only. CVI-005 — Hash-chain integrity.
 *
 * Errors are swallowed — audit failure must not disrupt the agent loop.
 * The underlying writeAuditEntry uses a fire-and-forget buffer.
 */
export function createAuditMiddleware(writer: AuditWriter): ToolMiddleware {
  return {
    phase: 'post',
    name: 'audit',
    priority: 10,
    async handler(context: ToolContext): Promise<MiddlewareResult> {
      const tenant = context.request.tenantContext;
      const input = context.toolCall.input;
      const patientId = (input.patientId ?? input.patient_id ?? input.id ?? '') as string;

      try {
        await writer.writeEntry({
          action: `MCP_TOOL_${context.toolResult?.success ? 'SUCCESS' : 'FAILURE'}`,
          resourceType: 'TOOL_EXECUTION',
          resourceId: `${context.toolCall.name}:${context.toolCall.id}`,
          userId: tenant?.clinicianId ?? 'system',
          actorType: 'AGENT',
          agentId: tenant?.agentId ?? 'agent-runtime',
          toolName: context.toolCall.name,
          success: context.toolResult?.success ?? false,
          accessReason: `Agent tool execution: ${context.toolCall.name}`,
          metadata: {
            toolCallId: context.toolCall.id,
            patientId: patientId || undefined,
            organizationId: tenant?.organizationId,
            sessionId: tenant?.sessionId,
            ...(context.toolResult?.error ? { error: context.toolResult.error } : {}),
          },
        });
      } catch {
        // Audit failure is non-fatal. Fire-and-forget buffer handles retries.
      }

      return { blocked: false };
    },
  };
}

// ─── Cost Tracking Middleware (Post-Phase, Priority 20) ─────────────────────

export function createCostMiddleware(tracker: CostTracker): ToolMiddleware {
  return {
    phase: 'post',
    name: 'cost',
    priority: 20,
    async handler(context: ToolContext): Promise<MiddlewareResult> {
      const tenant = context.request.tenantContext;

      try {
        await tracker.recordToolUsage({
          toolName: context.toolCall.name,
          organizationId: tenant?.organizationId ?? '',
          agentId: tenant?.agentId ?? 'agent-runtime',
          success: context.toolResult?.success ?? false,
          executionTimeMs: 0, // Caller can enrich via auditMetadata
        });
      } catch {
        // Cost tracking failure is non-fatal
      }

      return { blocked: false };
    },
  };
}

// ─── Middleware Pipeline Builder ─────────────────────────────────────────────

/**
 * Convenience: build the standard HoliLabs middleware stack in one call.
 *
 * Returns middleware in the correct execution order:
 *   PRE:  RBAC → Consent → DeId
 *   POST: Audit → Cost
 */
export function buildStandardMiddleware(deps: {
  rbac: { checker: RBACChecker; permissions: ToolPermissionMap };
  consent: { verifier: ConsentVerifier; consentMap: ToolConsentMap };
  deid: { deidentifier: DeIdentifier; toolsRequiringDeId: Set<string> };
  audit: AuditWriter;
  cost: CostTracker;
}): ToolMiddleware[] {
  return [
    createRBACMiddleware(deps.rbac.checker, deps.rbac.permissions),
    createConsentMiddleware(deps.consent.verifier, deps.consent.consentMap),
    createDeIdMiddleware(deps.deid.deidentifier, deps.deid.toolsRequiringDeId),
    createAuditMiddleware(deps.audit),
    createCostMiddleware(deps.cost),
  ];
}
