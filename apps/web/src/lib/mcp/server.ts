/**
 * MCP Server - Agent-accessible tool server
 * 
 * This module provides the MCP server interface for agents to discover
 * and execute clinical tools with proper authentication and audit logging.
 */

import { registry, executeTool, getToolSchemas } from './registry';
import type { MCPContext, MCPToolRequest, MCPToolResponse } from './types';
import { logger } from '@/lib/logger';

// =============================================================================
// MCP SERVER
// =============================================================================

class MCPServer {
    private static instance: MCPServer;
    private initialized = false;

    private constructor() { }

    static getInstance(): MCPServer {
        if (!MCPServer.instance) {
            MCPServer.instance = new MCPServer();
        }
        return MCPServer.instance;
    }

    /**
     * Initialize the MCP server
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        logger.info({
            event: 'mcp_server_initializing',
            toolCount: registry.getAllTools().length,
        });

        this.initialized = true;

        logger.info({
            event: 'mcp_server_ready',
            toolCount: registry.getAllTools().length,
            categories: [...new Set(registry.getAllTools().map(t => t.category))],
        });
    }

    /**
     * List all available tools (for agent discovery)
     */
    listTools(): ReturnType<typeof getToolSchemas> {
        return getToolSchemas();
    }

    /**
     * Execute a tool by name
     */
    async callTool(
        toolName: string,
        input: Record<string, any>,
        context: MCPContext
    ): Promise<MCPToolResponse> {
        const request: MCPToolRequest = {
            tool: toolName,
            input,
            context,
        };

        return executeTool(request);
    }

    /**
     * Get server info
     */
    getInfo() {
        return {
            name: 'holilabs-clinical',
            version: '1.0.0',
            protocol: 'mcp',
            capabilities: {
                tools: true,
                resources: false,
                prompts: false,
            },
            toolCount: registry.getAllTools().length,
            categories: [...new Set(registry.getAllTools().map(t => t.category))],
        };
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
        try {
            const toolCount = registry.getAllTools().length;
            return {
                status: toolCount > 0 ? 'healthy' : 'degraded',
                details: {
                    initialized: this.initialized,
                    toolCount,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const mcpServer = MCPServer.getInstance();

/**
 * Create an MCP context from a session
 */
export function createMCPContext(
    clinicianId: string,
    agentId: string,
    roles: string[],
    sessionId?: string,
    clinicId?: string
): MCPContext {
    return {
        clinicianId,
        agentId,
        sessionId: sessionId || crypto.randomUUID(),
        roles,
        clinicId,
    };
}

/**
 * Quick helper to execute a tool
 */
export async function runTool(
    toolName: string,
    input: Record<string, any>,
    context: MCPContext
): Promise<MCPToolResponse> {
    return mcpServer.callTool(toolName, input, context);
}
