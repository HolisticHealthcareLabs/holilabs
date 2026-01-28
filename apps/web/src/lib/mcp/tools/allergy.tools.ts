/**
 * Allergy MCP Tools - CRUD operations for patient allergies
 *
 * These tools manage allergy documentation with severity and reaction tracking.
 * Critical for medication safety checks. Uses `any` types for Prisma results.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateAllergySchema,
    UpdateAllergySchema,
    DeleteAllergySchema,
    type CreateAllergyInput,
    type UpdateAllergyInput,
    type DeleteAllergyInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: create_allergy
// =============================================================================

async function createAllergyHandler(
    input: CreateAllergyInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Check for duplicate allergy (same allergen)
    const existingAllergy = await prisma.allergy.findFirst({
        where: {
            patientId: input.patientId,
            allergen: { equals: input.allergen, mode: 'insensitive' },
            isActive: true,
        },
    });

    if (existingAllergy) {
        return {
            success: false,
            error: `Allergy to "${input.allergen}" already documented for this patient`,
            data: { existingAllergyId: existingAllergy.id },
        };
    }

    // Parse onset date if provided
    let onsetDate: Date | undefined;
    if (input.onsetDate) {
        onsetDate = new Date(input.onsetDate);
        if (isNaN(onsetDate.getTime())) {
            return {
                success: false,
                error: 'Invalid onset date format. Use ISO format (YYYY-MM-DD)',
                data: null,
            };
        }
    }

    const allergy: any = await prisma.allergy.create({
        data: {
            patientId: input.patientId,
            allergen: input.allergen,
            allergyType: input.allergyType,
            severity: input.severity,
            reactions: input.reactions,
            category: input.category,
            onsetDate,
            diagnosedBy: context.clinicianId,
            notes: input.notes,
            crossReactiveWith: input.crossReactiveWith || [],
            isActive: true,
            verificationStatus: 'UNVERIFIED',
            createdBy: context.clinicianId,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_allergy',
        allergyId: allergy.id,
        patientId: input.patientId,
        allergen: input.allergen,
        severity: input.severity,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            allergyId: allergy.id,
            allergen: allergy.allergen,
            severity: allergy.severity,
            reactions: allergy.reactions,
            message: 'Allergy documented successfully',
            warning: allergy.severity === 'SEVERE'
                ? 'SEVERE allergy documented. Ensure all care team members are notified.'
                : undefined,
        },
    };
}

// =============================================================================
// TOOL: update_allergy
// =============================================================================

async function updateAllergyHandler(
    input: UpdateAllergyInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find allergy and verify access through patient
    const allergy: any = await prisma.allergy.findFirst({
        where: { id: input.allergyId },
        include: { patient: true },
    });

    if (!allergy) {
        return {
            success: false,
            error: 'Allergy not found',
            data: null,
        };
    }

    if (allergy.patient?.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied',
            data: null,
        };
    }

    if (!allergy.isActive) {
        return {
            success: false,
            error: 'Cannot update inactive allergy. Create a new allergy record if needed.',
            data: null,
        };
    }

    // Build update data
    const updateData: any = {};
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.reactions !== undefined) updateData.reactions = input.reactions;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.verificationStatus !== undefined) updateData.verificationStatus = input.verificationStatus;
    if (input.crossReactiveWith !== undefined) updateData.crossReactiveWith = input.crossReactiveWith;

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No fields to update provided',
            data: null,
        };
    }

    const updatedAllergy: any = await prisma.allergy.update({
        where: { id: input.allergyId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_allergy',
        allergyId: updatedAllergy.id,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            allergyId: updatedAllergy.id,
            allergen: updatedAllergy.allergen,
            severity: updatedAllergy.severity,
            verificationStatus: updatedAllergy.verificationStatus,
            updatedFields: Object.keys(updateData),
            message: 'Allergy updated successfully',
        },
    };
}

// =============================================================================
// TOOL: delete_allergy
// =============================================================================

async function deleteAllergyHandler(
    input: DeleteAllergyInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find allergy and verify access through patient
    const allergy: any = await prisma.allergy.findFirst({
        where: { id: input.allergyId },
        include: { patient: true },
    });

    if (!allergy) {
        return {
            success: false,
            error: 'Allergy not found',
            data: null,
        };
    }

    if (allergy.patient?.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied',
            data: null,
        };
    }

    if (!allergy.isActive) {
        return {
            success: false,
            error: 'Allergy is already inactive',
            data: null,
        };
    }

    // Soft delete - set isActive to false and record reason
    const updatedAllergy: any = await prisma.allergy.update({
        where: { id: input.allergyId },
        data: {
            isActive: false,
            resolvedAt: new Date(),
            resolvedBy: context.clinicianId,
            notes: allergy.notes
                ? `${allergy.notes}\n[RESOLVED] ${input.reason}`
                : `[RESOLVED] ${input.reason}`,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_allergy',
        allergyId: updatedAllergy.id,
        allergen: allergy.allergen,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            allergyId: updatedAllergy.id,
            allergen: allergy.allergen,
            previousStatus: 'ACTIVE',
            newStatus: 'RESOLVED',
            reason: input.reason,
            resolvedAt: updatedAllergy.resolvedAt,
            message: 'Allergy marked as resolved/inactive',
        },
    };
}

// =============================================================================
// EXPORT: Allergy Tools
// =============================================================================

export const allergyTools: MCPTool[] = [
    {
        name: 'create_allergy',
        description: 'Document a new allergy for a patient with severity and reactions. Critical for medication safety.',
        category: 'patient',
        inputSchema: CreateAllergySchema,
        requiredPermissions: ['allergy:write', 'patient:read'],
        handler: createAllergyHandler,
    },
    {
        name: 'update_allergy',
        description: 'Update allergy severity, reactions, or verification status.',
        category: 'patient',
        inputSchema: UpdateAllergySchema,
        requiredPermissions: ['allergy:write'],
        handler: updateAllergyHandler,
    },
    {
        name: 'delete_allergy',
        description: 'Deactivate an allergy record (e.g., allergy disproved by testing). Preserves audit trail.',
        category: 'patient',
        inputSchema: DeleteAllergySchema,
        requiredPermissions: ['allergy:write'],
        handler: deleteAllergyHandler,
    },
];
