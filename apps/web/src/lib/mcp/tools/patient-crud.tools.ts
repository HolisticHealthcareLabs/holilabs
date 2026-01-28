/**
 * Patient CRUD MCP Tools - Create, Update, Delete operations for patients
 *
 * These tools extend the existing patient.tools.ts with write operations.
 * Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreatePatientSchema,
    UpdatePatientSchema,
    DeletePatientSchema,
    type CreatePatientInput,
    type UpdatePatientInput,
    type DeletePatientInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// Helper to generate MRN and tokenId
function generateMRN(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `MRN-${timestamp}-${random}`.toUpperCase();
}

function generateTokenId(): string {
    const segments = [
        Math.random().toString(36).substring(2, 6),
        Math.random().toString(36).substring(2, 6),
        Math.random().toString(36).substring(2, 6),
    ];
    return `PT-${segments.join('-')}`;
}

// =============================================================================
// TOOL: create_patient
// =============================================================================

async function createPatientHandler(
    input: CreatePatientInput,
    context: MCPContext
): Promise<MCPResult> {
    // Parse and validate date of birth
    const dateOfBirth = new Date(input.dateOfBirth);
    if (isNaN(dateOfBirth.getTime())) {
        return {
            success: false,
            error: 'Invalid date of birth format. Use ISO format (YYYY-MM-DD)',
            data: null,
        };
    }

    // Create patient with required fields
    const patient: any = await prisma.patient.create({
        data: {
            firstName: input.firstName,
            lastName: input.lastName,
            dateOfBirth,
            gender: input.gender,
            email: input.email,
            phone: input.phone,
            address: input.address,
            city: input.city,
            state: input.state,
            postalCode: input.postalCode,
            country: input.country || 'MX',
            mrn: generateMRN(),
            tokenId: generateTokenId(),
            isActive: true,
            assignedClinicianId: context.clinicianId,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_patient',
        patientId: patient.id,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            patientId: patient.id,
            mrn: patient.mrn,
            tokenId: patient.tokenId,
            message: 'Patient created successfully',
        },
    };
}

// =============================================================================
// TOOL: update_patient
// =============================================================================

async function updatePatientHandler(
    input: UpdatePatientInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient exists and belongs to this clinician
    const existingPatient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!existingPatient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Build update data (only include provided fields)
    const updateData: any = {};
    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.gender !== undefined) updateData.gender = input.gender;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.state !== undefined) updateData.state = input.state;
    if (input.postalCode !== undefined) updateData.postalCode = input.postalCode;

    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No fields to update provided',
            data: null,
        };
    }

    const patient: any = await prisma.patient.update({
        where: { id: input.patientId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_patient',
        patientId: patient.id,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            patientId: patient.id,
            updatedFields: Object.keys(updateData),
            message: 'Patient updated successfully',
        },
    };
}

// =============================================================================
// TOOL: delete_patient (soft delete)
// =============================================================================

async function deletePatientHandler(
    input: DeletePatientInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient exists and belongs to this clinician
    const existingPatient = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId,
        },
    });

    if (!existingPatient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    if (!existingPatient.isActive) {
        return {
            success: false,
            error: 'Patient is already deactivated',
            data: null,
        };
    }

    // Soft delete - set isActive to false and record deletion info
    const patient: any = await prisma.patient.update({
        where: { id: input.patientId },
        data: {
            isActive: false,
            deletedAt: new Date(),
            deletionReason: input.reason,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'delete_patient',
        patientId: patient.id,
        reason: input.reason,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            patientId: patient.id,
            previousStatus: 'ACTIVE',
            newStatus: 'DEACTIVATED',
            reason: input.reason,
            deletedAt: patient.deletedAt,
            message: 'Patient deactivated successfully (soft delete)',
        },
    };
}

// =============================================================================
// EXPORT: Patient CRUD Tools
// =============================================================================

export const patientCrudTools: MCPTool[] = [
    {
        name: 'create_patient',
        description: 'Create a new patient record with demographics. Automatically generates MRN and tokenId.',
        category: 'patient',
        inputSchema: CreatePatientSchema,
        requiredPermissions: ['patient:write'],
        handler: createPatientHandler,
    },
    {
        name: 'update_patient',
        description: 'Update patient demographics (name, contact info, address). Does not modify medical records.',
        category: 'patient',
        inputSchema: UpdatePatientSchema,
        requiredPermissions: ['patient:write'],
        handler: updatePatientHandler,
    },
    {
        name: 'delete_patient',
        description: 'Soft delete a patient by deactivating their record. Patient data is preserved for audit.',
        category: 'patient',
        inputSchema: DeletePatientSchema,
        requiredPermissions: ['patient:write'],
        handler: deletePatientHandler,
    },
];
