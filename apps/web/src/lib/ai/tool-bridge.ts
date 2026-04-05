/**
 * MCP ↔ LLM Tool Bridge
 *
 * Converts between the MCP tool registry (Zod schemas, MCPContext, MCPResult)
 * and the LLM provider interface (ToolDefinition, ToolCall).
 *
 * Two directions:
 * 1. mcpToolsToDefinitions() — MCP registry → ToolDefinition[] for provider.chat({ tools })
 * 2. executeToolCalls()      — ToolCall[] from provider → MCP registry execution → tool result messages
 *
 * ELENA invariant: This bridge is for context gathering and workflow automation only.
 * No tool call result is used as a clinical recommendation without human review.
 */

import type { ToolDefinition, ToolCall, ChatMessage } from './types';
import type { MCPContext, MCPResult } from '@/lib/mcp/types';
import logger from '@/lib/logger';

/**
 * Convert MCP tool schemas from the registry into ToolDefinition[]
 * suitable for passing to provider.chat({ tools }).
 *
 * @param schemas - Output of registry.getToolSchemas()
 * @param filter  - Optional category or name filter
 */
export function mcpToolsToDefinitions(
  schemas: Array<{
    name: string;
    description: string;
    category: string;
    inputSchema: object;
    requiredPermissions: string[];
  }>,
  filter?: { categories?: string[]; names?: string[] },
): ToolDefinition[] {
  let filtered = schemas;

  if (filter?.categories?.length) {
    const cats = new Set(filter.categories);
    filtered = filtered.filter((s) => cats.has(s.category));
  }

  if (filter?.names?.length) {
    const names = new Set(filter.names);
    filtered = filtered.filter((s) => names.has(s.name));
  }

  return filtered.map((schema) => ({
    name: schema.name,
    description: schema.description,
    parameters: schema.inputSchema as Record<string, unknown>,
  }));
}

/**
 * Result of executing a batch of tool calls.
 */
export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  /** True when a middleware (RBAC, consent, de-id) blocked execution. */
  blocked?: boolean;
  result: MCPResult;
}

/**
 * Structured denial returned when middleware blocks a tool call.
 * Fed back to the LLM as a tool_result so the agent adapts behavior.
 */
export interface ToolDenial {
  blocked: true;
  /** Why the tool was blocked (e.g., "RBAC: NURSE role cannot prescribe"). */
  reason: string;
  /** Suggested alternative (e.g., "Request CLINICIAN to perform this action"). */
  suggestion?: string;
}

/**
 * Optional middleware checker that runs before tool execution.
 * Returns null if the tool call is allowed, or a ToolDenial if blocked.
 */
export type MiddlewareChecker = (
  toolCall: ToolCall,
  context: MCPContext,
) => Promise<ToolDenial | null>;

/**
 * Execute tool calls returned by a provider against the MCP registry.
 *
 * When a middlewareChecker is provided and blocks a tool call, the denial
 * reason + suggestion is returned as a structured tool_result so the LLM
 * sees it and adapts (e.g., NURSE blocked from prescribing → agent
 * suggests escalation to CLINICIAN).
 *
 * @param toolCalls - ToolCall[] from provider response
 * @param context   - MCPContext for permission checks and audit
 * @param executor  - Function that executes a single tool (default: registry.executeTool)
 * @param middlewareChecker - Optional pre-execution middleware gate
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  context: MCPContext,
  executor: (request: {
    tool: string;
    input: Record<string, unknown>;
    context: MCPContext;
  }) => Promise<{ success: boolean; result: MCPResult }>,
  middlewareChecker?: MiddlewareChecker,
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const call of toolCalls) {
    // ── Pre-execution middleware check ───────────────────────────────
    if (middlewareChecker) {
      const denial = await middlewareChecker(call, context);
      if (denial) {
        logger.warn({
          event: 'tool_bridge_blocked',
          tool: call.name,
          callId: call.id,
          reason: denial.reason,
        });

        results.push({
          toolCallId: call.id,
          toolName: call.name,
          success: false,
          blocked: true,
          result: {
            success: false,
            data: {
              blocked: true,
              reason: denial.reason,
              suggestion: denial.suggestion,
            },
            error: denial.reason,
          },
        });
        continue;
      }
    }

    // ── Execute tool ────────────────────────────────────────────────
    try {
      const response = await executor({
        tool: call.name,
        input: call.arguments,
        context,
      });

      results.push({
        toolCallId: call.id,
        toolName: call.name,
        success: response.success,
        result: response.result,
      });
    } catch (error) {
      logger.error({
        event: 'tool_bridge_execution_error',
        tool: call.name,
        callId: call.id,
        error: error instanceof Error ? error.message : 'Unknown',
      });

      results.push({
        toolCallId: call.id,
        toolName: call.name,
        success: false,
        result: {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Tool execution failed',
        },
      });
    }
  }

  return results;
}

/**
 * Convert tool call results into ChatMessage[] for the next provider turn.
 * Uses role: 'tool' with the tool call ID for providers that support it,
 * or role: 'user' with a formatted text block for providers that don't.
 *
 * @param results       - Output of executeToolCalls()
 * @param useToolRole   - Whether the provider supports role: 'tool' (Anthropic, OpenAI). Default true.
 */
export function toolResultsToMessages(
  results: ToolCallResult[],
  useToolRole = true,
): ChatMessage[] {
  if (useToolRole) {
    return results.map((r) => ({
      role: 'tool' as const,
      content: JSON.stringify(r.result.data ?? { error: r.result.error }),
      toolCallId: r.toolCallId,
    }));
  }

  // Fallback: concatenate results into a single user message
  const text = results
    .map((r) => {
      const status = r.success ? 'OK' : 'ERROR';
      const body = r.success
        ? JSON.stringify(r.result.data)
        : r.result.error || 'Unknown error';
      return `[Tool: ${r.toolName}] (${status})\n${body}`;
    })
    .join('\n\n');

  return [{ role: 'user', content: `Tool results:\n\n${text}` }];
}
