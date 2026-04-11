/**
 * MCP Schema Converter — Zod → JSON Schema 2020-12
 *
 * Converts HoliLabs MCPToolRegistry Zod schemas into MCP-compliant
 * JSON Schema 2020-12 format for tools/list responses.
 *
 * Uses zod-to-json-schema for robust conversion, then annotates with
 * MCP-specific metadata (category, requiredPermissions, examples).
 */

import { zodToJsonSchema as zodConvert } from 'zod-to-json-schema';
import type { ZodType } from 'zod';
import type { MCPTool, MCPToolExample } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface MCPToolSchema {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  metadata: {
    category: string;
    requiredPermissions: string[];
    deprecated?: boolean;
    alternatives?: string[];
    dependsOn?: string[];
    examples?: MCPToolExample[];
  };
}

// =============================================================================
// CORE CONVERSION
// =============================================================================

/**
 * Convert a single Zod schema to MCP JSON Schema 2020-12.
 *
 * Strips the $schema field (MCP spec defines dialect at transport level)
 * and ensures the output is a plain object schema.
 */
export function zodToMCPJsonSchema(zodSchema: ZodType<unknown>): Record<string, unknown> {
  const jsonSchema = zodConvert(zodSchema, {
    target: 'jsonSchema2019-09',
    $refStrategy: 'none',
  }) as Record<string, unknown>;

  // MCP spec uses JSON Schema 2020-12 but tool inputSchema omits $schema
  const { $schema: _schema, ...rest } = jsonSchema;

  return rest;
}

/**
 * Convert a full MCPTool into an MCP-compatible tool schema.
 */
export function convertToolToMCPSchema(tool: MCPTool): MCPToolSchema {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToMCPJsonSchema(tool.inputSchema),
    metadata: {
      category: tool.category,
      requiredPermissions: tool.requiredPermissions,
      ...(tool.deprecated ? { deprecated: tool.deprecated } : {}),
      ...(tool.alternatives?.length ? { alternatives: tool.alternatives } : {}),
      ...(tool.dependsOn?.length ? { dependsOn: tool.dependsOn } : {}),
      ...(tool.examples?.length ? { examples: tool.examples } : {}),
    },
  };
}

/**
 * Batch-convert all tools from the registry into MCP tool schemas.
 */
export function convertAllToolsToMCPSchemas(tools: MCPTool[]): MCPToolSchema[] {
  return tools.map(convertToolToMCPSchema);
}
