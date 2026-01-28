/**
 * Feature Flag MCP Tools - CRUD operations for feature flags
 *
 * These tools manage feature toggles for AI features and clinic-specific settings.
 * Supports global flags and clinic-specific overrides.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateFeatureFlagSchema,
    GetFeatureFlagSchema,
    UpdateFeatureFlagSchema,
    DeleteFeatureFlagSchema,
    type CreateFeatureFlagInput,
    type GetFeatureFlagInput,
    type UpdateFeatureFlagInput,
    type DeleteFeatureFlagInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: create_feature_flag
// =============================================================================

async function createFeatureFlagHandler(
    input: CreateFeatureFlagInput,
    context: MCPContext
): Promise<MCPResult> {
    // Check if flag already exists for this scope
    const existingFlag = await prisma.featureFlag.findFirst({
        where: {
            name: input.name,
            clinicId: input.clinicId || null,
        },
    });

    if (existingFlag) {
        return {
            success: false,
            error: `Feature flag "${input.name}" already exists for this scope`,
            data: { existingFlagId: existingFlag.id },
        };
    }

    const flag: any = await prisma.featureFlag.create({
        data: {
            name: input.name,
            description: input.description,
            enabled: input.enabled ?? true,
            clinicId: input.clinicId || null,
            createdBy: context.clinicianId,
            reason: input.reason,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_feature_flag',
        flagId: flag.id,
        name: flag.name,
        enabled: flag.enabled,
        scope: input.clinicId ? 'clinic' : 'global',
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            flagId: flag.id,
            name: flag.name,
            enabled: flag.enabled,
            scope: input.clinicId ? 'clinic-specific' : 'global',
            message: 'Feature flag created successfully',
        },
    };
}

// =============================================================================
// TOOL: get_feature_flag
// =============================================================================

async function getFeatureFlagHandler(
    input: GetFeatureFlagInput,
    context: MCPContext
): Promise<MCPResult> {
    // First try to find clinic-specific override if clinicId provided
    let flag: any = null;

    if (input.clinicId) {
        flag = await prisma.featureFlag.findFirst({
            where: {
                name: input.name,
                clinicId: input.clinicId,
            },
        });
    }

    // If no clinic-specific flag, fall back to global
    if (!flag) {
        flag = await prisma.featureFlag.findFirst({
            where: {
                name: input.name,
                clinicId: null,
            },
        });
    }

    if (!flag) {
        return {
            success: false,
            error: `Feature flag "${input.name}" not found`,
            data: null,
        };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_feature_flag',
        flagId: flag.id,
        name: flag.name,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            flagId: flag.id,
            name: flag.name,
            description: flag.description,
            enabled: flag.enabled,
            scope: flag.clinicId ? 'clinic-specific' : 'global',
            clinicId: flag.clinicId,
            createdAt: flag.createdAt,
            updatedAt: flag.updatedAt,
            reason: flag.reason,
        },
    };
}

// =============================================================================
// TOOL: update_feature_flag
// =============================================================================

async function updateFeatureFlagHandler(
    input: UpdateFeatureFlagInput,
    context: MCPContext
): Promise<MCPResult> {
    const existingFlag = await prisma.featureFlag.findUnique({
        where: { id: input.flagId },
    });

    if (!existingFlag) {
        return {
            success: false,
            error: 'Feature flag not found',
            data: null,
        };
    }

    // Build update data
    const updateData: any = {
        reason: input.reason, // Always record reason for audit
    };
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.description !== undefined) updateData.description = input.description;

    const flag: any = await prisma.featureFlag.update({
        where: { id: input.flagId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_feature_flag',
        flagId: flag.id,
        name: flag.name,
        previousEnabled: existingFlag.enabled,
        newEnabled: flag.enabled,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            flagId: flag.id,
            name: flag.name,
            enabled: flag.enabled,
            previousEnabled: existingFlag.enabled,
            reason: input.reason,
            message: input.enabled !== existingFlag.enabled
                ? `Feature flag "${flag.name}" ${flag.enabled ? 'enabled' : 'disabled'}`
                : 'Feature flag updated',
        },
    };
}

// =============================================================================
// TOOL: delete_feature_flag
// =============================================================================

async function deleteFeatureFlagHandler(
    input: DeleteFeatureFlagInput,
    context: MCPContext
): Promise<MCPResult> {
    const existingFlag = await prisma.featureFlag.findUnique({
        where: { id: input.flagId },
    });

    if (!existingFlag) {
        return {
            success: false,
            error: 'Feature flag not found',
            data: null,
        };
    }

    // Hard delete feature flags (they can be recreated)
    await prisma.featureFlag.delete({
        where: { id: input.flagId },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_feature_flag',
        flagId: existingFlag.id,
        name: existingFlag.name,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            flagId: existingFlag.id,
            name: existingFlag.name,
            reason: input.reason,
            message: `Feature flag "${existingFlag.name}" deleted`,
        },
    };
}

// =============================================================================
// EXPORT: Feature Flag Tools
// =============================================================================

export const featureFlagTools: MCPTool[] = [
    {
        name: 'create_feature_flag',
        description: 'Create a new feature flag. Can be global or clinic-specific override.',
        category: 'admin',
        inputSchema: CreateFeatureFlagSchema,
        requiredPermissions: ['admin:write'],
        handler: createFeatureFlagHandler,
    },
    {
        name: 'get_feature_flag',
        description: 'Get a feature flag value. Returns clinic-specific override if exists, otherwise global.',
        category: 'admin',
        inputSchema: GetFeatureFlagSchema,
        requiredPermissions: ['admin:read'],
        handler: getFeatureFlagHandler,
    },
    {
        name: 'update_feature_flag',
        description: 'Update a feature flag (enable/disable). Requires reason for audit trail.',
        category: 'admin',
        inputSchema: UpdateFeatureFlagSchema,
        requiredPermissions: ['admin:write'],
        handler: updateFeatureFlagHandler,
    },
    {
        name: 'delete_feature_flag',
        description: 'Delete a feature flag. Use with caution - typically prefer disabling.',
        category: 'admin',
        inputSchema: DeleteFeatureFlagSchema,
        requiredPermissions: ['admin:write'],
        handler: deleteFeatureFlagHandler,
    },
];
