/**
 * Diagnosis MCP Tools - CRUD operations for patient diagnoses
 *
 * These tools provide full diagnosis management with ICD-10 coding support.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateDiagnosisSchema,
    UpdateDiagnosisSchema,
    DeleteDiagnosisSchema,
    type CreateDiagnosisInput,
    type UpdateDiagnosisInput,
    type DeleteDiagnosisInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: create_diagnosis
// =============================================================================

async function createDiagnosisHandler(
    input: CreateDiagnosisInput,
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

    // Determine if this should be primary (first active diagnosis)
    const isPrimary = input.type === 'primary';

    // If setting as primary, unset other primary diagnoses
    if (isPrimary) {
        await prisma.diagnosis.updateMany({
            where: {
                patientId: input.patientId,
                isPrimary: true,
                status: 'ACTIVE',
            },
            data: { isPrimary: false },
        });
    }

    // Map input type to status
    const status = input.type === 'rule_out' ? 'RULED_OUT' : 'ACTIVE';

    const diagnosis: any = await prisma.diagnosis.create({
        data: {
            patientId: input.patientId,
            icd10Code: input.code,
            description: input.description,
            status,
            isPrimary,
            onsetDate,
            diagnosedBy: context.clinicianId,
            notes: input.notes,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_diagnosis',
        diagnosisId: diagnosis.id,
        patientId: input.patientId,
        icd10Code: input.code,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            diagnosisId: diagnosis.id,
            icd10Code: diagnosis.icd10Code,
            description: diagnosis.description,
            status: diagnosis.status,
            isPrimary: diagnosis.isPrimary,
            message: 'Diagnosis created successfully',
        },
    };
}

// =============================================================================
// TOOL: update_diagnosis
// =============================================================================

async function updateDiagnosisHandler(
    input: UpdateDiagnosisInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find diagnosis and verify access through patient
    const diagnosis: any = await prisma.diagnosis.findFirst({
        where: { id: input.diagnosisId },
        include: { patient: true },
    });

    if (!diagnosis) {
        return {
            success: false,
            error: 'Diagnosis not found',
            data: null,
        };
    }

    if (diagnosis.patient?.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied',
            data: null,
        };
    }

    // Build update data
    const updateData: any = {};
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.severity !== undefined) updateData.severity = input.severity;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // Handle isPrimary update
    if (input.isPrimary === true) {
        // Unset other primary diagnoses for this patient
        await prisma.diagnosis.updateMany({
            where: {
                patientId: diagnosis.patientId,
                isPrimary: true,
                id: { not: input.diagnosisId },
            },
            data: { isPrimary: false },
        });
        updateData.isPrimary = true;
    } else if (input.isPrimary === false) {
        updateData.isPrimary = false;
    }

    // Handle resolved date
    if (input.resolvedAt !== undefined) {
        const resolvedAt = new Date(input.resolvedAt);
        if (isNaN(resolvedAt.getTime())) {
            return {
                success: false,
                error: 'Invalid resolved date format. Use ISO format (YYYY-MM-DD)',
                data: null,
            };
        }
        updateData.resolvedAt = resolvedAt;
        if (!input.status) {
            updateData.status = 'RESOLVED';
        }
    }

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No fields to update provided',
            data: null,
        };
    }

    const updatedDiagnosis: any = await prisma.diagnosis.update({
        where: { id: input.diagnosisId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_diagnosis',
        diagnosisId: updatedDiagnosis.id,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            diagnosisId: updatedDiagnosis.id,
            icd10Code: updatedDiagnosis.icd10Code,
            status: updatedDiagnosis.status,
            updatedFields: Object.keys(updateData),
            message: 'Diagnosis updated successfully',
        },
    };
}

// =============================================================================
// TOOL: delete_diagnosis
// =============================================================================

async function deleteDiagnosisHandler(
    input: DeleteDiagnosisInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find diagnosis and verify access through patient
    const diagnosis: any = await prisma.diagnosis.findFirst({
        where: { id: input.diagnosisId },
        include: { patient: true },
    });

    if (!diagnosis) {
        return {
            success: false,
            error: 'Diagnosis not found',
            data: null,
        };
    }

    if (diagnosis.patient?.assignedClinicianId !== context.clinicianId) {
        return {
            success: false,
            error: 'Access denied',
            data: null,
        };
    }

    // Soft delete by setting status to RULED_OUT with notes
    const updatedDiagnosis: any = await prisma.diagnosis.update({
        where: { id: input.diagnosisId },
        data: {
            status: 'RULED_OUT',
            resolvedAt: new Date(),
            notes: diagnosis.notes
                ? `${diagnosis.notes}\n[REMOVED] ${input.reason}`
                : `[REMOVED] ${input.reason}`,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_diagnosis',
        diagnosisId: updatedDiagnosis.id,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            diagnosisId: updatedDiagnosis.id,
            icd10Code: updatedDiagnosis.icd10Code,
            previousStatus: diagnosis.status,
            newStatus: 'RULED_OUT',
            reason: input.reason,
            message: 'Diagnosis marked as ruled out',
        },
    };
}

// =============================================================================
// EXPORT: Diagnosis Tools
// =============================================================================

export const diagnosisTools: MCPTool[] = [
    {
        name: 'create_diagnosis',
        description: 'Add a new diagnosis to a patient record with ICD-10 code. Can be marked as primary, secondary, or rule-out.',
        category: 'diagnosis',
        inputSchema: CreateDiagnosisSchema,
        requiredPermissions: ['condition:write', 'patient:read'],
        handler: createDiagnosisHandler,
    },
    {
        name: 'update_diagnosis',
        description: 'Update diagnosis details including status, severity, and primary designation.',
        category: 'diagnosis',
        inputSchema: UpdateDiagnosisSchema,
        requiredPermissions: ['condition:write'],
        handler: updateDiagnosisHandler,
    },
    {
        name: 'delete_diagnosis',
        description: 'Remove a diagnosis by marking it as ruled out. Preserves record for audit trail.',
        category: 'diagnosis',
        inputSchema: DeleteDiagnosisSchema,
        requiredPermissions: ['condition:write'],
        handler: deleteDiagnosisHandler,
    },
];
