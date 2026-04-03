/**
 * External Tool Bridge
 *
 * Merges external MCP tools (from connected servers like Medplum, Momentum FHIR)
 * into the HoliLabs tool-bridge pipeline so they can be used alongside internal
 * tools in agent orchestration.
 *
 * External tools get AGENT role (read-only by default).
 * Tagged with { source: 'external', serverUrl, serverName } for audit.
 */

import type { ToolDefinition } from '@/lib/ai/types';
import { getMCPClientManager, type ExternalMCPTool } from './mcp-client';
import type { SecurityGateContext } from './security-gate';

// =============================================================================
// TYPES
// =============================================================================

export interface ExternalToolDefinition extends ToolDefinition {
  source: 'external';
  serverUrl: string;
  serverName: string;
}

// =============================================================================
// TOOL CONVERSION
// =============================================================================

/**
 * Convert external MCP tools into ToolDefinition[] compatible with
 * our AI provider interface (same format as mcpToolsToDefinitions).
 *
 * External tools are tagged so the executor knows to route them through
 * the MCP client rather than the internal registry.
 */
export function externalToolsToDefinitions(
  tools?: ExternalMCPTool[],
): ExternalToolDefinition[] {
  const externalTools = tools ?? getMCPClientManager().getAllExternalTools();

  return externalTools.map((tool) => ({
    name: `ext_${tool.serverName}_${tool.name}`,
    description: `[External: ${tool.serverName}] ${tool.description}`,
    parameters: tool.inputSchema,
    source: 'external' as const,
    serverUrl: tool.serverUrl,
    serverName: tool.serverName,
  }));
}

/**
 * Check if a tool name refers to an external tool.
 */
export function isExternalTool(toolName: string): boolean {
  return toolName.startsWith('ext_');
}

/**
 * Parse an external tool name back to its server and original tool name.
 */
export function parseExternalToolName(
  prefixedName: string,
): { serverName: string; originalName: string; serverUrl: string } | null {
  if (!isExternalTool(prefixedName)) return null;

  const withoutPrefix = prefixedName.slice(4); // Remove 'ext_'
  const tools = getMCPClientManager().getAllExternalTools();

  // Find the matching tool by trying each server's tools
  for (const tool of tools) {
    const expectedPrefix = `${tool.serverName}_${tool.name}`;
    if (withoutPrefix === expectedPrefix) {
      return {
        serverName: tool.serverName,
        originalName: tool.name,
        serverUrl: tool.serverUrl,
      };
    }
  }

  return null;
}

// =============================================================================
// EXECUTION
// =============================================================================

/**
 * Execute an external tool call through the MCP client with full security.
 *
 * Resolves the prefixed tool name, routes to the correct external server,
 * and returns the result in the same format as internal tool execution.
 */
export async function executeExternalToolCall(
  prefixedToolName: string,
  args: Record<string, unknown>,
  ctx: SecurityGateContext,
): Promise<{ success: boolean; data: unknown; error?: string }> {
  const parsed = parseExternalToolName(prefixedToolName);
  if (!parsed) {
    return {
      success: false,
      data: null,
      error: `Unknown external tool: ${prefixedToolName}`,
    };
  }

  return getMCPClientManager().executeTool(
    parsed.serverUrl,
    parsed.originalName,
    args,
    ctx,
  );
}

// =============================================================================
// MERGED PIPELINE
// =============================================================================

/**
 * Get a merged list of internal + external tool definitions.
 *
 * Internal tools come from mcpToolsToDefinitions (existing).
 * External tools come from connected MCP servers.
 *
 * Use this in the agent orchestration loop to give the LLM access
 * to both internal and external tools.
 */
export function getMergedToolDefinitions(
  internalTools: ToolDefinition[],
): ToolDefinition[] {
  const externalDefs = externalToolsToDefinitions();
  return [...internalTools, ...externalDefs];
}
