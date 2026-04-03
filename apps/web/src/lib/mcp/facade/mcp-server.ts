/**
 * MCP Server Facade
 *
 * Wraps the existing MCPToolRegistry (70+ tools, 27 categories) as a
 * standard MCP server using @modelcontextprotocol/sdk. Exposes tools
 * via JSON-RPC 2.0 over Streamable HTTP at /api/mcp/v1.
 *
 * Architecture:
 *   McpServer (SDK) ← registers all tools from MCPToolRegistry
 *   ↓ tool call
 *   middleware-adapter (consent, RBAC, de-id, audit)
 *   ↓
 *   MCPToolRegistry.executeTool() (existing pipeline)
 *
 * CYRUS: Every tool call passes through createProtectedRoute-equivalent RBAC.
 * RUTH: Consent middleware (wrapWithConsentCheck) preserved — it's in the registry.
 * ELENA: No clinical decisions happen here — tools are context-gathering only.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '@/lib/logger';
import { redactObject } from '@/lib/security/redact-phi';
import { convertToolToMCPSchema } from './schema-converter';
import {
  executeWithMiddleware,
  type MCPMiddlewareContext,
} from './middleware-adapter';
import type { MCPContext, MCPTool } from '../types';

// =============================================================================
// SINGLETON
// =============================================================================

let serverInstance: McpServer | null = null;

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create and configure the MCP server facade.
 *
 * Lazily registers all tools from the MCPToolRegistry the first time
 * it's called. Subsequent calls return the same instance.
 */
export function getOrCreateMCPServer(): McpServer {
  if (serverInstance) {
    return serverInstance;
  }

  serverInstance = new McpServer(
    {
      name: 'holilabs-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
      instructions:
        'HoliLabs V2 MCP Server — LATAM healthcare platform. ' +
        'All tools require authentication. Patient data tools require LGPD consent. ' +
        'Clinical tool results are for context gathering only — not clinical recommendations.',
    },
  );

  // Lazily register tools on first access (avoids import-time side effects)
  registerAllTools(serverInstance);

  logger.info(redactObject({ event: 'mcp_server_facade_created' }));

  return serverInstance;
}

// =============================================================================
// TOOL REGISTRATION
// =============================================================================

/**
 * Register all tools from MCPToolRegistry onto the McpServer instance.
 *
 * Each tool is registered with:
 *   - MCP JSON Schema 2020-12 input schema (via schema-converter)
 *   - Annotations: category, permissions, readOnlyHint, destructiveHint
 *   - Handler that routes through middleware-adapter → registry.executeTool
 */
function registerAllTools(server: McpServer): void {
  // Lazy require to avoid circular dependency with registry singleton
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registry } = require('../registry') as {
    registry: { getAllTools: () => MCPTool[]; executeTool: (req: unknown) => Promise<unknown> };
  };

  if (!registry) {
    logger.warn(redactObject({ event: 'mcp_facade_registry_unavailable' }));
    return;
  }

  const tools = registry.getAllTools();

  for (const tool of tools) {
    const mcpSchema = convertToolToMCPSchema(tool);
    const isReadOnly = tool.name.startsWith('get_') ||
      tool.name.startsWith('search_') ||
      tool.name.startsWith('list_');
    const isDestructive = tool.name.startsWith('delete_') ||
      tool.name.startsWith('remove_');

    server.tool(
      tool.name,
      tool.description,
      mcpSchema.inputSchema as Record<string, unknown>,
      async (args: Record<string, unknown>, extra) => {
        // Build MCPContext from the extra.authInfo or session metadata
        const mcpContext = extractMCPContext(extra);
        const middlewareCtx: MCPMiddlewareContext = {
          mcpContext,
          isExternalClient: isExternalRequest(extra),
          clientId: (extra as Record<string, unknown>)?.clientId as string ?? 'mcp-facade',
          ipAddress: (extra as Record<string, unknown>)?.ipAddress as string ?? 'unknown',
        };

        const response = await executeWithMiddleware(
          tool.name,
          tool.category,
          async () => {
            return registry.executeTool({
              tool: tool.name,
              input: args,
              context: mcpContext,
            }) as Promise<{
              tool: string;
              success: boolean;
              result: { success: boolean; data: unknown; error?: string };
              executionTimeMs: number;
              timestamp: string;
            }>;
          },
          middlewareCtx,
        );

        if (!response.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  error: response.result.error ?? 'Tool execution failed',
                  tool: tool.name,
                  ...(response.result.meta?.warnings?.length
                    ? { suggestedAction: response.result.meta.warnings[0] }
                    : {}),
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response.result.data),
            },
          ],
        };
      },
    );
  }

  logger.info(
    redactObject({
      event: 'mcp_facade_tools_registered',
      count: tools.length,
      categories: [...new Set(tools.map((t) => t.category))],
    }),
  );
}

// =============================================================================
// CONTEXT EXTRACTION
// =============================================================================

/**
 * Extract MCPContext from the MCP request extras.
 *
 * In production, this is populated from JWT claims or session data
 * injected by the route handler's auth middleware.
 */
function extractMCPContext(extra: unknown): MCPContext {
  const ext = extra as Record<string, unknown> | undefined;
  const authInfo = ext?.authInfo as Record<string, unknown> | undefined;

  return {
    clinicianId: (authInfo?.userId as string) ?? (ext?.clinicianId as string) ?? '',
    agentId: (authInfo?.agentId as string) ?? (ext?.agentId as string) ?? 'mcp-facade',
    sessionId: (authInfo?.sessionId as string) ?? (ext?.sessionId as string) ?? '',
    roles: (authInfo?.roles as string[]) ?? (ext?.roles as string[]) ?? [],
    clinicId: (authInfo?.clinicId as string) ?? (ext?.clinicId as string) ?? undefined,
    emergencyOverride: (ext?.emergencyOverride as boolean) ?? false,
    emergencyJustification: (ext?.emergencyJustification as string) ?? undefined,
  };
}

/**
 * Determine if the request originates from an external MCP client.
 */
function isExternalRequest(extra: unknown): boolean {
  const ext = extra as Record<string, unknown> | undefined;
  return (ext?.isExternalClient as boolean) ?? false;
}

// =============================================================================
// RESET (for testing)
// =============================================================================

export function resetMCPServer(): void {
  serverInstance = null;
}
