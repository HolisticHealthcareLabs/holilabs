/**
 * MCP Types - Core type definitions for the MCP tool layer
 */

import { z } from 'zod';

/**
 * Context passed to every MCP tool handler
 */
export interface MCPContext {
    /** The authenticated clinician's ID */
    clinicianId: string;

    /** The agent's identifier (for audit trail) */
    agentId: string;

    /** Session ID for the current interaction */
    sessionId: string;

    /** User's roles for permission checking */
    roles: string[];

    /** Optional: The clinic/organization ID for multi-tenant isolation */
    clinicId?: string;
}

/**
 * Standard result type for all MCP tool handlers
 */
export interface MCPResult {
    success: boolean;
    data: any;
    error?: string;
    meta?: {
        executionTimeMs?: number;
        cached?: boolean;
        warnings?: string[];
    };
}

/**
 * Example usage for a tool
 */
export interface MCPToolExample {
    /** Description of what this example demonstrates */
    description: string;

    /** Example input parameters */
    input: Record<string, any>;

    /** Optional: Expected output description or structure */
    expectedOutput?: string;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
    /** Unique tool name (snake_case) */
    name: string;

    /** Human-readable description for the agent */
    description: string;

    /** Tool category for organization */
    category: 'patient' | 'clinical-note' | 'governance' | 'medication' | 'diagnosis' | 'appointment' | 'admin' | 'messaging' | 'document' | 'form' | 'portal' | 'lab';

    /** Zod schema for input validation */
    inputSchema: z.ZodType<any>;

    /** Required permissions to execute this tool */
    requiredPermissions: string[];

    /** The handler function */
    handler: (input: any, context: MCPContext) => Promise<MCPResult>;

    /** Optional: Is this tool deprecated? */
    deprecated?: boolean;

    /** Optional: Suggested alternatives if deprecated */
    alternatives?: string[];

    /** Optional: Tool names this tool depends on (should be called first) */
    dependsOn?: string[];

    /** Optional: Usage examples for discovery and documentation */
    examples?: MCPToolExample[];
}

/**
 * Tool execution request
 */
export interface MCPToolRequest {
    tool: string;
    input: Record<string, any>;
    context: MCPContext;
}

/**
 * Tool execution response
 */
export interface MCPToolResponse {
    tool: string;
    success: boolean;
    result: MCPResult;
    executionTimeMs: number;
    timestamp: string;
}

/**
 * Tool registry interface
 */
export interface MCPRegistry {
    /** Get all registered tools */
    getAllTools(): MCPTool[];

    /** Get a tool by name */
    getToolByName(name: string): MCPTool | undefined;

    /** Get tools by category */
    getToolsByCategory(category: string): MCPTool[];

    /** Search tools by description */
    searchTools(query: string): MCPTool[];

    /** Execute a tool */
    executeTool(request: MCPToolRequest): Promise<MCPToolResponse>;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
    allowed: boolean;
    missingPermissions: string[];
}
