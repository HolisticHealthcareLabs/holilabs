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
import { prescriptionTools } from './tools/prescription.tools';
import { appointmentTools } from './tools/appointment.tools';
import { labOrderTools } from './tools/lab-order.tools';
import { documentTools } from './tools/document.tools';
import { formTools } from './tools/form.tools';
import { portalTools } from './tools/portal.tools';
import { aiTools } from './tools/ai.tools';
import { consentTools } from './tools/consent.tools';
import { scribeTools } from './tools/scribe.tools';
import { preventionTools } from './tools/prevention.tools';
import { schedulingTools } from './tools/scheduling.tools';
import { notificationTools } from './tools/notification.tools';
import { searchTools as searchToolsModule } from './tools/search.tools';
import { analyticsTools } from './tools/analytics.tools';
import { clinicalDecisionTools } from './tools/clinical-decision.tools';
import type { MCPTool, MCPContext, MCPResult, MCPRegistry, MCPToolRequest, MCPToolResponse, PermissionCheckResult, MCPToolExample } from './types';
import {
    getWorkflowTemplates,
    getWorkflowById,
    getWorkflowsByCategory,
    searchWorkflows,
    getWorkflowSchemas,
    executeWorkflow,
    type WorkflowTemplate,
    type WorkflowResult,
} from './workflows';

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
            ...prescriptionTools,
            ...appointmentTools,
            ...labOrderTools,
            ...documentTools,
            ...formTools,
            ...portalTools,
            ...aiTools,
            ...consentTools,
            ...scribeTools,
            ...preventionTools,
            ...schedulingTools,
            ...notificationTools,
            ...searchToolsModule,
            ...analyticsTools,
            ...clinicalDecisionTools,
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

    /**
     * Get a tool with full details including examples and dependencies
     */
    getToolWithExamples(name: string): {
        name: string;
        description: string;
        category: string;
        inputSchema: object;
        requiredPermissions: string[];
        dependsOn?: string[];
        examples?: MCPToolExample[];
        deprecated?: boolean;
        alternatives?: string[];
    } | undefined {
        const tool = this.tools.get(name);
        if (!tool) {
            return undefined;
        }

        return {
            name: tool.name,
            description: tool.description,
            category: tool.category,
            inputSchema: this.zodToJsonSchema(tool.inputSchema),
            requiredPermissions: tool.requiredPermissions,
            dependsOn: tool.dependsOn,
            examples: tool.examples,
            deprecated: tool.deprecated,
            alternatives: tool.alternatives,
        };
    }

    /**
     * Get all workflow templates
     */
    getWorkflows(): WorkflowTemplate[] {
        return getWorkflowTemplates();
    }

    /**
     * Get workflow by ID
     */
    getWorkflowById(id: string): WorkflowTemplate | undefined {
        return getWorkflowById(id);
    }

    /**
     * Get workflows by category
     */
    getWorkflowsByCategory(category: 'clinical' | 'administrative' | 'billing'): WorkflowTemplate[] {
        return getWorkflowsByCategory(category);
    }

    /**
     * Search workflows by query
     */
    searchWorkflows(query: string): WorkflowTemplate[] {
        return searchWorkflows(query);
    }

    /**
     * Get workflow schemas for agent discovery
     */
    getWorkflowSchemas() {
        return getWorkflowSchemas();
    }

    /**
     * Execute a workflow template
     */
    async executeWorkflow(
        workflowId: string,
        context: MCPContext,
        initialInputs: Record<string, any>
    ): Promise<WorkflowResult> {
        return executeWorkflow(workflowId, context, initialInputs);
    }

    /**
     * Get tools that depend on a specific tool
     */
    getToolDependents(toolName: string): MCPTool[] {
        return Array.from(this.tools.values()).filter(
            t => t.dependsOn?.includes(toolName)
        );
    }

    /**
     * Get tools that a specific tool depends on
     */
    getToolDependencies(toolName: string): MCPTool[] {
        const tool = this.tools.get(toolName);
        if (!tool?.dependsOn) {
            return [];
        }

        return tool.dependsOn
            .map(name => this.tools.get(name))
            .filter((t): t is MCPTool => t !== undefined);
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
                'note:sign',
                'medication:read',
                'medication:write',
                'prescription:read',
                'prescription:write',
                'allergy:read',
                'allergy:write',
                'condition:read',
                'condition:write',
                'governance:read',
                'governance:override',
                'message:read',
                'message:write',
                'admin:read',
                'document:read',
                'document:write',
                'document:share',
                'form:read',
                'form:write',
                'notification:read',
                'notification:write',
                'preferences:read',
                'preferences:write',
                'ai:read',
                'ai:write',
                'consent:read',
                'consent:write',
                'prevention:read',
                'prevention:write',
                'scribe:read',
                'scribe:write',
                'search:read',
                'search:write',
                'analytics:read',
                'billing:read',
            ],
            NURSE: [
                'patient:read',
                'note:read',
                'note:write',
                'medication:read',
                'prescription:read',
                'allergy:read',
                'condition:read',
                'governance:read',
                'message:read',
                'document:read',
                'form:read',
                'notification:read',
                'preferences:read',
                'ai:read',
                'consent:read',
                'prevention:read',
                'scribe:read',
                'search:read',
            ],
            AGENT: [
                'patient:read',
                'patient:write',
                'note:read',
                'note:write',
                'note:sign',
                'medication:read',
                'medication:write',
                'prescription:read',
                'prescription:write',
                'allergy:read',
                'allergy:write',
                'condition:read',
                'condition:write',
                'governance:read',
                'governance:write',
                'message:read',
                'message:write',
                'admin:read',
                'document:read',
                'document:write',
                'document:share',
                'form:read',
                'form:write',
                'notification:read',
                'notification:write',
                'preferences:read',
                'preferences:write',
                'ai:read',
                'ai:write',
                'consent:read',
                'consent:write',
                'prevention:read',
                'prevention:write',
                'scribe:read',
                'scribe:write',
                'analytics:read',
                'analytics:export',
                'billing:read',
                'search:read',
                'search:write',
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

// =============================================================================
// WORKFLOW EXPORTS
// =============================================================================

export function getWorkflows(): WorkflowTemplate[] {
    return registry.getWorkflows();
}

export function getWorkflowByIdFromRegistry(id: string): WorkflowTemplate | undefined {
    return registry.getWorkflowById(id);
}

export function getWorkflowsByCategoryFromRegistry(category: 'clinical' | 'administrative' | 'billing'): WorkflowTemplate[] {
    return registry.getWorkflowsByCategory(category);
}

export function searchWorkflowsFromRegistry(query: string): WorkflowTemplate[] {
    return registry.searchWorkflows(query);
}

export function getWorkflowSchemasFromRegistry() {
    return registry.getWorkflowSchemas();
}

export async function executeWorkflowFromRegistry(
    workflowId: string,
    context: MCPContext,
    initialInputs: Record<string, any>
): Promise<WorkflowResult> {
    return registry.executeWorkflow(workflowId, context, initialInputs);
}

// =============================================================================
// ENHANCED DISCOVERY EXPORTS
// =============================================================================

export function getToolWithExamples(name: string) {
    return registry.getToolWithExamples(name);
}

export function getToolDependents(toolName: string): MCPTool[] {
    return registry.getToolDependents(toolName);
}

export function getToolDependencies(toolName: string): MCPTool[] {
    return registry.getToolDependencies(toolName);
}

// Re-export workflow types
export type { WorkflowTemplate, WorkflowResult } from './workflows';
export type { WorkflowStep, WorkflowStepResult } from './workflows';
