/**
 * MCP Middleware Adapter
 *
 * Wraps MCP tool execution with HoliLabs' existing security, consent,
 * audit, and governance middleware. Ensures every MCP tool call passes
 * through the same pipeline as internal API routes.
 *
 * PRE-execution:
 *   1. RBAC permission check (via MCPToolRegistry.checkPermissions)
 *   2. Consent verification (wrapWithConsentCheck — LGPD Art. 7/11)
 *   3. De-identification for external-facing responses
 *
 * POST-execution:
 *   4. Audit entry with hash-chain (writeAuditEntry)
 *   5. GovernanceEvent emission (agentEventBus)
 */

import { writeAuditEntry } from '@/lib/audit/write-audit-entry';
import { deidentifyTranscriptOrThrow } from '@/lib/deid/transcript-gate';
import { logger } from '@/lib/logger';
import { redactObject } from '@/lib/security/redact-phi';
import { agentEventBus, deriveAffectedEntities } from '../agent-event-bus';
import type { MCPContext, MCPResult, MCPToolResponse } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface MCPMiddlewareContext {
  /** Standard MCP context from authenticated session */
  mcpContext: MCPContext;
  /** Whether the caller is an external MCP client (triggers de-id on responses) */
  isExternalClient: boolean;
  /** Client identifier for audit trail */
  clientId: string;
  /** IP address for rate limiting and audit */
  ipAddress: string;
}

export interface MiddlewareResult {
  blocked: boolean;
  reason?: string;
  suggestedAction?: string;
}

// =============================================================================
// PRE-EXECUTION MIDDLEWARE
// =============================================================================

/**
 * Validate that the MCP context has required fields for tool execution.
 */
export function validateMCPContext(ctx: MCPMiddlewareContext): MiddlewareResult {
  const { mcpContext } = ctx;

  if (!mcpContext.clinicianId) {
    return {
      blocked: true,
      reason: 'Missing clinicianId — authentication required',
      suggestedAction: 'Authenticate via JWT or session before calling tools',
    };
  }

  if (!mcpContext.roles?.length) {
    return {
      blocked: true,
      reason: 'No roles assigned — RBAC check cannot proceed',
      suggestedAction: 'Ensure the authenticated user has at least one role',
    };
  }

  if (!mcpContext.sessionId) {
    return {
      blocked: true,
      reason: 'Missing sessionId — required for audit trail',
      suggestedAction: 'Include a session identifier in the MCP request',
    };
  }

  return { blocked: false };
}

// =============================================================================
// POST-EXECUTION MIDDLEWARE
// =============================================================================

/**
 * Write audit entry after tool execution (hash-chain preserved).
 */
export async function auditToolExecution(
  toolName: string,
  success: boolean,
  ctx: MCPMiddlewareContext,
  executionTimeMs: number,
  errorMessage?: string,
): Promise<void> {
  const { mcpContext, clientId, isExternalClient } = ctx;

  await writeAuditEntry({
    action: `mcp.facade.${toolName}${success ? '' : '.error'}`,
    resourceType: 'MCP_TOOL_EXECUTION',
    resourceId: toolName,
    userId: mcpContext.clinicianId,
    actorType: 'AGENT',
    agentId: mcpContext.agentId,
    accessReason: isExternalClient
      ? `External MCP client tool execution: ${toolName}`
      : `MCP facade tool execution: ${toolName}`,
    metadata: {
      toolName,
      sessionId: mcpContext.sessionId,
      clientId,
      isExternalClient,
      success,
      executionTimeMs,
      ...(errorMessage ? { error: errorMessage } : {}),
    },
    clinicId: mcpContext.clinicId,
  });
}

/**
 * Emit governance event after tool execution.
 */
export function emitGovernanceEvent(
  toolName: string,
  category: string,
  success: boolean,
  ctx: MCPMiddlewareContext,
): void {
  const { mcpContext } = ctx;
  const affectedEntities = deriveAffectedEntities(toolName);

  agentEventBus.publish({
    type: success ? 'tool_completed' : 'tool_failed',
    tool: toolName,
    category,
    success,
    affectedEntities: affectedEntities.length > 0 ? affectedEntities : undefined,
    clinicianId: mcpContext.clinicianId,
    agentId: mcpContext.agentId,
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// RESPONSE DE-IDENTIFICATION (for external clients — RVI-003/RVI-006)
// =============================================================================

/**
 * De-identify tool response data before returning to external MCP clients.
 * Internal clients receive raw responses (already behind auth boundary).
 */
export async function deidentifyResponseIfExternal(
  result: MCPResult,
  ctx: MCPMiddlewareContext,
): Promise<MCPResult> {
  if (!ctx.isExternalClient) {
    return result;
  }

  if (!result.data) {
    return result;
  }

  try {
    const serialized = JSON.stringify(result.data);
    const deidentified = await deidentifyTranscriptOrThrow(serialized);
    return {
      ...result,
      data: JSON.parse(deidentified),
    };
  } catch (error) {
    logger.error(redactObject({
      event: 'mcp_facade_deid_failure',
      error: error instanceof Error ? error.message : 'De-identification failed',
    }));

    // RVI-006: If de-id fails for external client, block the response entirely
    return {
      success: false,
      data: null,
      error: 'Response de-identification failed — data withheld per RVI-006',
    };
  }
}

// =============================================================================
// FULL MIDDLEWARE PIPELINE
// =============================================================================

/**
 * Execute a tool through the full middleware pipeline.
 *
 * 1. Validate context
 * 2. Execute via registry (which already has consent wrapping + RBAC)
 * 3. De-identify response if external client
 * 4. Audit + governance event
 */
export async function executeWithMiddleware(
  toolName: string,
  toolCategory: string,
  executeFn: () => Promise<MCPToolResponse>,
  ctx: MCPMiddlewareContext,
): Promise<MCPToolResponse> {
  const startTime = Date.now();

  // Step 1: Validate context
  const validation = validateMCPContext(ctx);
  if (validation.blocked) {
    return {
      tool: toolName,
      success: false,
      result: {
        success: false,
        data: null,
        error: validation.reason,
        meta: { warnings: validation.suggestedAction ? [validation.suggestedAction] : undefined },
      },
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  // Step 2: Execute (registry already applies consent + RBAC + idempotency)
  let response: MCPToolResponse;
  try {
    response = await executeFn();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Tool execution failed';
    const executionTimeMs = Date.now() - startTime;

    await auditToolExecution(toolName, false, ctx, executionTimeMs, errorMsg);
    emitGovernanceEvent(toolName, toolCategory, false, ctx);

    return {
      tool: toolName,
      success: false,
      result: { success: false, data: null, error: errorMsg },
      executionTimeMs,
      timestamp: new Date().toISOString(),
    };
  }

  const executionTimeMs = Date.now() - startTime;

  // Step 3: De-identify if external client
  response.result = await deidentifyResponseIfExternal(response.result, ctx);

  // Step 4: Audit + governance (fire-and-forget for latency)
  auditToolExecution(toolName, response.success, ctx, executionTimeMs).catch((err) => {
    logger.error(redactObject({
      event: 'mcp_facade_audit_error',
      tool: toolName,
      error: err instanceof Error ? err.message : 'Audit write failed',
    }));
  });

  emitGovernanceEvent(toolName, toolCategory, response.success, ctx);

  return response;
}
