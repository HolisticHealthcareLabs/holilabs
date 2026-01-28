/**
 * MCP Tool Registry - Central registry for all agent tools
 * 
 * Provides tool discovery, validation, and execution.
 */

import { logger } from '@/lib/logger';
import { patientTools } from './tools/patient.tools';
import { patientCrudTools } from './tools/patient-crud.tools';
import { governanceTools } from './tools/governance.tools';
import { clinicalNoteTools } from './tools/clinical-note.tools';
import { medicationTools } from './tools/medication.tools';
import { diagnosisTools } from './tools/diagnosis.tools';
import { allergyTools } from './tools/allergy.tools';
import { featureFlagTools } from './tools/feature-flag.tools';
import { messagingTools } from './tools/messaging.tools';
import type { MCPTool, MCPContext, MCPResult, MCPRegistry, MCPToolRequest, MCPToolResponse, PermissionCheckResult } from './types';

// =============================================================================
// TOOL REGISTRY
// =============================================================================

class MCPToolRegistry implements MCPRegistry {
    private tools: Map<string, MCPTool> = new Map();
    private static instance: MCPToolRegistry;

    private constructor() {
        this.registerTools();
    }

    static getInstance(): MCPToolRegistry {
        if (!MCPToolRegistry.instance) {
            MCPToolRegistry.instance = new MCPToolRegistry();
        }
        return MCPToolRegistry.instance;
    }

    private registerTools(): void {
        // Register all tool modules
        const allTools = [
            ...patientTools,
            ...patientCrudTools,
            ...governanceTools,
            ...clinicalNoteTools,
            ...medicationTools,
            ...diagnosisTools,
            ...allergyTools,
            ...featureFlagTools,
            ...messagingTools,
        ];

        for (const tool of allTools) {
            if (this.tools.has(tool.name)) {
                logger.warn({
                    event: 'mcp_duplicate_tool',
                    tool: tool.name,
                    message: 'Tool name already registered, skipping duplicate',
                });
                continue;
            }
            this.tools.set(tool.name, tool);
        }

        logger.info({
            event: 'mcp_registry_initialized',
            toolCount: this.tools.size,
            categories: [...new Set(allTools.map(t => t.category))],
        });
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    getAllTools(): MCPTool[] {
        return Array.from(this.tools.values()).filter(t => !t.deprecated);
    }

    getToolByName(name: string): MCPTool | undefined {
        return this.tools.get(name);
    }

    getToolsByCategory(category: string): MCPTool[] {
        return Array.from(this.tools.values()).filter(
            t => t.category === category && !t.deprecated
        );
    }

    searchTools(query: string): MCPTool[] {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.tools.values()).filter(
            t =>
                !t.deprecated &&
                (t.name.toLowerCase().includes(lowerQuery) ||
                    t.description.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Check if context has required permissions for a tool
     */
    checkPermissions(tool: MCPTool, context: MCPContext): PermissionCheckResult {
        const userPermissions = this.getPermissionsForRoles(context.roles);
        const missingPermissions = tool.requiredPermissions.filter(
            p => !userPermissions.includes(p) && !userPermissions.includes('*')
        );

        return {
            allowed: missingPermissions.length === 0,
            missingPermissions,
        };
    }

    /**
     * Execute a tool with validation and audit logging
     */
    async executeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
        const startTime = Date.now();
        const { tool: toolName, input, context } = request;

        // Find tool
        const tool = this.tools.get(toolName);
        if (!tool) {
            return {
                tool: toolName,
                success: false,
                result: { success: false, error: `Tool '${toolName}' not found`, data: null },
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }

        // Check permissions
        const permCheck = this.checkPermissions(tool, context);
        if (!permCheck.allowed) {
            logger.warn({
                event: 'mcp_permission_denied',
                tool: toolName,
                agentId: context.agentId,
                missingPermissions: permCheck.missingPermissions,
            });

            return {
                tool: toolName,
                success: false,
                result: {
                    success: false,
                    error: `Permission denied. Missing: ${permCheck.missingPermissions.join(', ')}`,
                    data: null,
                },
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }

        // Validate input
        const validation = tool.inputSchema.safeParse(input);
        if (!validation.success) {
            return {
                tool: toolName,
                success: false,
                result: {
                    success: false,
                    error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
                    data: null,
                },
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }

        // Execute tool
        try {
            const result = await tool.handler(validation.data, context);

            logger.info({
                event: 'mcp_tool_completed',
                tool: toolName,
                success: result.success,
                executionTimeMs: Date.now() - startTime,
                agentId: context.agentId,
                clinicianId: context.clinicianId,
            });

            return {
                tool: toolName,
                success: result.success,
                result,
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            logger.error({
                event: 'mcp_tool_error',
                tool: toolName,
                error: error instanceof Error ? error.message : 'Unknown error',
                agentId: context.agentId,
            });

            return {
                tool: toolName,
                success: false,
                result: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Tool execution failed',
                    data: null,
                },
                executionTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString(),
            };
        }
    }

    /**
     * Get tool schemas in JSON Schema format for agent discovery
     */
    getToolSchemas(): Array<{
        name: string;
        description: string;
        category: string;
        inputSchema: object;
        requiredPermissions: string[];
    }> {
        return this.getAllTools().map(tool => ({
            name: tool.name,
            description: tool.description,
            category: tool.category,
            inputSchema: this.zodToJsonSchema(tool.inputSchema),
            requiredPermissions: tool.requiredPermissions,
        }));
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    private getPermissionsForRoles(roles: string[]): string[] {
        const rolePermissions: Record<string, string[]> = {
            ADMIN: ['*'], // Superuser
            CLINICIAN: [
                'patient:read',
                'patient:write',
                'note:read',
                'note:write',
                'medication:read',
                'medication:write',
                'allergy:read',
                'allergy:write',
                'condition:read',
                'condition:write',
                'governance:read',
                'governance:override',
                'message:read',
                'message:write',
                'admin:read',
            ],
            NURSE: [
                'patient:read',
                'note:read',
                'note:write',
                'medication:read',
                'allergy:read',
                'condition:read',
                'governance:read',
                'message:read',
            ],
            AGENT: [
                'patient:read',
                'patient:write',
                'note:read',
                'note:write',
                'medication:read',
                'medication:write',
                'allergy:read',
                'allergy:write',
                'condition:read',
                'condition:write',
                'governance:read',
                'governance:write',
                'message:read',
                'message:write',
                'admin:read',
            ],
        };

        const permissions: Set<string> = new Set();
        for (const role of roles) {
            const perms = rolePermissions[role] || [];
            perms.forEach(p => permissions.add(p));
        }

        return Array.from(permissions);
    }

    private zodToJsonSchema(schema: any): object {
        // Simplified Zod to JSON Schema conversion
        // In production, use zod-to-json-schema package
        try {
            if (schema._def?.typeName === 'ZodObject') {
                const shape = schema._def.shape();
                const properties: Record<string, any> = {};
                const required: string[] = [];

                for (const [key, value] of Object.entries(shape)) {
                    const zodType = value as any;
                    properties[key] = {
                        type: this.getJsonSchemaType(zodType),
                        description: zodType._def?.description || undefined,
                    };
                    if (!zodType.isOptional()) {
                        required.push(key);
                    }
                }

                return {
                    type: 'object',
                    properties,
                    required,
                };
            }
        } catch {
            // Fallback
        }

        return { type: 'object' };
    }

    private getJsonSchemaType(zodType: any): string {
        const typeName = zodType._def?.typeName;
        switch (typeName) {
            case 'ZodString':
                return 'string';
            case 'ZodNumber':
                return 'number';
            case 'ZodBoolean':
                return 'boolean';
            case 'ZodArray':
                return 'array';
            case 'ZodObject':
                return 'object';
            default:
                return 'string';
        }
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const registry = MCPToolRegistry.getInstance();

export function getAllRegisteredTools(): MCPTool[] {
    return registry.getAllTools();
}

export function getToolByName(name: string): MCPTool | undefined {
    return registry.getToolByName(name);
}

export function getToolsByCategory(category: string): MCPTool[] {
    return registry.getToolsByCategory(category);
}

export function searchTools(query: string): MCPTool[] {
    return registry.searchTools(query);
}

export function getToolSchemas() {
    return registry.getToolSchemas();
}

export async function executeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
    return registry.executeTool(request);
}
