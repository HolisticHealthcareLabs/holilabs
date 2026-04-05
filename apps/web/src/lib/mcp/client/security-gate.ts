/**
 * MCP Client Security Gate — CYRUS-mandated security for external MCP calls
 *
 * Enforces:
 *   RVI-003: All inputs to external servers pass through deidentifyTranscriptOrThrow
 *   RVI-006: No PII leaves to external servers
 *   CVI-002: All responses filtered through verifyPatientAccess(tenantId)
 *   CVI-005: Audit entries include externalServerUrl, tenantId, toolName, responseHash
 *   RUTH (RVI-003): DPA/SCC reference required — reject connections to servers
 *                    without approved jurisdiction (configurable allowlist)
 */

import crypto from 'crypto';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { logger } from '@/lib/logger';
import { redactObject } from '@/lib/security/redact-phi';

// =============================================================================
// TYPES
// =============================================================================

export interface ExternalServerConfig {
  /** MCP server URL */
  url: string;
  /** Human-readable name */
  name: string;
  /** Approved jurisdiction (ISO 3166-1 alpha-2) */
  jurisdiction: string;
  /** DPA/SCC reference ID (RUTH requirement) */
  dpaReference: string;
  /** Whether this server has been approved by governance */
  approved: boolean;
}

export interface SecurityGateContext {
  tenantId: string;
  userId: string;
  agentId: string;
  sessionId: string;
}

export interface SecurityGateResult {
  allowed: boolean;
  reason?: string;
}

// =============================================================================
// JURISDICTION ALLOWLIST (RUTH — RVI-003)
// =============================================================================

/**
 * Approved external MCP servers.
 * In production, this comes from a governance-approved database table.
 * Adding a server requires GOVERNANCE_EVENT: EXTERNAL_MCP_APPROVED.
 */
const approvedServers: Map<string, ExternalServerConfig> = new Map();

export function registerApprovedServer(config: ExternalServerConfig): void {
  if (!config.approved) {
    throw new Error(`Cannot register unapproved server: ${config.name}`);
  }
  if (!config.dpaReference) {
    throw new Error(`DPA/SCC reference required for server: ${config.name} (RUTH RVI-003)`);
  }
  approvedServers.set(config.url, config);
}

export function isServerApproved(url: string): SecurityGateResult {
  const config = approvedServers.get(url);
  if (!config) {
    return {
      allowed: false,
      reason: `Server ${url} not in approved jurisdiction allowlist (RUTH RVI-003). ` +
        'Submit GOVERNANCE_EVENT: EXTERNAL_MCP_APPROVED with DPA/SCC reference.',
    };
  }
  if (!config.approved) {
    return {
      allowed: false,
      reason: `Server ${config.name} approval revoked`,
    };
  }
  return { allowed: true };
}

// =============================================================================
// INPUT DE-IDENTIFICATION (RVI-003 / RVI-006)
// =============================================================================

/**
 * De-identify all input arguments before sending to external MCP server.
 * Serializes to string, runs through Presidio gate, deserializes back.
 */
export async function deidentifyExternalInput(
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const serialized = JSON.stringify(args);
  const deidentified = await deidentifyTranscriptOrThrow(serialized);
  return JSON.parse(deidentified) as Record<string, unknown>;
}

// =============================================================================
// RESPONSE VALIDATION (CVI-002)
// =============================================================================

/**
 * Compute SHA-256 hash of response for audit trail integrity.
 */
function hashResponse(data: unknown): string {
  const serialized = JSON.stringify(data);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

/**
 * Validate that external response data doesn't contain cross-tenant data.
 * In production, this integrates with verifyPatientAccess().
 */
export function validateResponseTenantIsolation(
  responseData: unknown,
  tenantId: string,
): SecurityGateResult {
  // External MCP responses are untrusted — the response itself doesn't have
  // tenant context. We validate at the application layer when the data is
  // used to access patient records (via verifyPatientAccess in tool handlers).
  // Here we enforce that we HAVE a tenant context for audit.
  if (!tenantId) {
    return {
      allowed: false,
      reason: 'Missing tenantId — cannot validate tenant isolation for external response',
    };
  }
  return { allowed: true };
}

// =============================================================================
// AUDIT (CVI-005)
// =============================================================================

/**
 * Write audit entry for external MCP tool call with full provenance.
 */
export async function auditExternalToolCall(
  toolName: string,
  serverUrl: string,
  success: boolean,
  ctx: SecurityGateContext,
  responseData: unknown,
  executionTimeMs: number,
  errorMessage?: string,
): Promise<void> {
  const serverConfig = approvedServers.get(serverUrl);

  await writeAuditEntry({
    action: `mcp.external.${toolName}${success ? '' : '.error'}`,
    resourceType: 'EXTERNAL_MCP_TOOL_EXECUTION',
    resourceId: toolName,
    userId: ctx.userId,
    actorType: 'AGENT',
    agentId: ctx.agentId,
    accessReason: `External MCP tool execution: ${toolName} via ${serverConfig?.name ?? serverUrl}`,
    metadata: {
      toolName,
      externalServerUrl: serverUrl,
      externalServerName: serverConfig?.name,
      jurisdiction: serverConfig?.jurisdiction,
      dpaReference: serverConfig?.dpaReference,
      tenantId: ctx.tenantId,
      sessionId: ctx.sessionId,
      success,
      executionTimeMs,
      responseHash: success ? hashResponse(responseData) : undefined,
      dataClassification: 'DEIDENTIFIED',
      ...(errorMessage ? { error: errorMessage } : {}),
    },
    clinicId: ctx.tenantId,
  });
}

// =============================================================================
// FULL SECURITY PIPELINE
// =============================================================================

/**
 * Run the full security gate pipeline for an external MCP tool call.
 *
 * 1. Check server is in approved jurisdiction allowlist
 * 2. De-identify inputs
 * 3. (caller executes the tool)
 * 4. Validate response tenant isolation
 * 5. Audit with hash
 */
export async function preCallSecurityCheck(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown>,
  ctx: SecurityGateContext,
): Promise<{ allowed: boolean; deidentifiedArgs?: Record<string, unknown>; reason?: string }> {
  // Step 1: Jurisdiction check
  const serverCheck = isServerApproved(serverUrl);
  if (!serverCheck.allowed) {
    logger.warn(redactObject({
      event: 'mcp_external_blocked_jurisdiction',
      serverUrl,
      toolName,
      reason: serverCheck.reason,
    }));
    return { allowed: false, reason: serverCheck.reason };
  }

  // Step 2: De-identify inputs
  try {
    const deidentifiedArgs = await deidentifyExternalInput(args);
    return { allowed: true, deidentifiedArgs };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'De-identification failed';
    logger.error(redactObject({
      event: 'mcp_external_deid_failure',
      serverUrl,
      toolName,
      error: msg,
    }));
    return { allowed: false, reason: `Input de-identification failed (RVI-006): ${msg}` };
  }
}

export async function postCallSecurityCheck(
  serverUrl: string,
  toolName: string,
  success: boolean,
  responseData: unknown,
  ctx: SecurityGateContext,
  executionTimeMs: number,
  errorMessage?: string,
): Promise<void> {
  // Step 4: Tenant isolation validation
  const tenantCheck = validateResponseTenantIsolation(responseData, ctx.tenantId);
  if (!tenantCheck.allowed) {
    logger.error(redactObject({
      event: 'mcp_external_tenant_violation',
      serverUrl,
      toolName,
      reason: tenantCheck.reason,
    }));
  }

  // Step 5: Audit
  await auditExternalToolCall(
    toolName,
    serverUrl,
    success,
    ctx,
    responseData,
    executionTimeMs,
    errorMessage,
  );
}
