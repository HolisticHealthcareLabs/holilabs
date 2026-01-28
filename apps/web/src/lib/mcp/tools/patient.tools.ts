/**
 * Patient MCP Tools - Agent-callable operations for patient management
 * 
 * These tools wrap existing API functionality to provide agent access
 * with proper authentication, validation, and audit logging.
 * 
 * Note: Uses `any` types for Prisma results due to complex relation typing.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    GetPatientSchema,
    SearchPatientsSchema,
    GetPatientMedicationsSchema,
    GetPatientAllergiesSchema,
    GetPatientConditionsSchema,
    type GetPatientInput,
    type SearchPatientsInput,
    type GetPatientMedicationsInput,
    type GetPatientAllergiesInput,
    type GetPatientConditionsInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// TOOL: get_patient
// =============================================================================

async function getPatientHandler(
    input: GetPatientInput,
    context: MCPContext
): Promise<MCPResult> {
    // Get patient with related data using any type for complex relations
    const patient: any = await prisma.patient.findFirst({
        where: {
            id: input.patientId,
            assignedClinicianId: context.clinicianId, // Tenant isolation
        },
        include: {
            allergies: { take: 10 },
            diagnoses: { take: 10 },
            medications: { take: 10 },
        },
    });

    if (!patient) {
        return {
            success: false,
            error: 'Patient not found or access denied',
            data: null,
        };
    }

    // Audit log
    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient',
        patientId: input.patientId,
        agentId: context.agentId,
        clinicianId: context.clinicianId,
    });

    return {
        success: true,
        data: {
            id: patient.id,
            firstName: patient.firstName,
            lastName: patient.lastName,
            dateOfBirth: patient.dateOfBirth,
            gender: patient.gender,
            mrn: patient.mrn,
            isActive: patient.isActive,
            allergies: (patient.allergies || []).map((a: any) => ({
                id: a.id,
                allergen: a.allergen,
                reactions: a.reactions,
                severity: a.severity,
            })),
            conditions: (patient.diagnoses || []).map((d: any) => ({
                id: d.id,
                code: d.code,
                description: d.description,
                isActive: d.isActive,
            })),
            activeMedications: (patient.medications || []).filter((m: any) => m.isActive).map((m: any) => ({
                id: m.id,
                name: m.name,
                dose: m.dose,
                frequency: m.frequency,
            })),
        },
    };
}

// =============================================================================
// TOOL: search_patients
// =============================================================================

async function searchPatientsHandler(
    input: SearchPatientsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { query, filters, page = 1, limit = 20 } = input;
    const skip = (page - 1) * limit;

    const where: any = {
        assignedClinicianId: context.clinicianId,
        OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { mrn: { contains: query, mode: 'insensitive' } },
        ],
    };

    if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
    }

    const [patients, total] = await Promise.all([
        prisma.patient.findMany({
            where,
            skip,
            take: limit,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                dateOfBirth: true,
                mrn: true,
                isActive: true,
            },
            orderBy: { lastName: 'asc' },
        }),
        prisma.patient.count({ where }),
    ]);

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'search_patients',
        query,
        resultCount: patients.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            patients,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
    };
}

// =============================================================================
// TOOL: get_patient_medications
// =============================================================================

async function getPatientMedicationsHandler(
    input: GetPatientMedicationsInput,
    context: MCPContext
): Promise<MCPResult> {
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    const where: any = { patientId: input.patientId };
    if (input.activeOnly) where.isActive = true;

    const medications = await prisma.medication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_medications',
        patientId: input.patientId,
        count: medications.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: medications.map((m: any) => ({
            id: m.id,
            name: m.name,
            dose: m.dose,
            frequency: m.frequency,
            route: m.route,
            isActive: m.isActive,
            startDate: m.startDate,
            endDate: m.endDate,
            prescribedBy: m.prescribedBy,
            instructions: m.instructions,
        })),
    };
}

// =============================================================================
// TOOL: get_patient_allergies
// =============================================================================

async function getPatientAllergiesHandler(
    input: GetPatientAllergiesInput,
    context: MCPContext
): Promise<MCPResult> {
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    const allergies = await prisma.allergy.findMany({
        where: { patientId: input.patientId, isActive: true },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_allergies',
        patientId: input.patientId,
        count: allergies.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: allergies.map((a: any) => ({
            id: a.id,
            allergen: a.allergen,
            reactions: a.reactions,
            severity: a.severity,
            onsetDate: a.onsetDate,
            notes: a.notes,
        })),
    };
}

// =============================================================================
// TOOL: get_patient_conditions
// =============================================================================

async function getPatientConditionsHandler(
    input: GetPatientConditionsInput,
    context: MCPContext
): Promise<MCPResult> {
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    const where: any = { patientId: input.patientId };
    if (input.activeOnly) where.isActive = true;

    const diagnoses = await prisma.diagnosis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_patient_conditions',
        patientId: input.patientId,
        count: diagnoses.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: diagnoses.map((d: any) => ({
            id: d.id,
            code: d.code,
            description: d.description,
            isActive: d.isActive,
            onsetDate: d.onsetDate,
            resolvedDate: d.resolvedDate,
            notes: d.notes,
        })),
    };
}

// =============================================================================
// EXPORT: Patient Tools
// =============================================================================

export const patientTools: MCPTool[] = [
    {
        name: 'get_patient',
        description: 'Retrieve patient demographics, active conditions, medications, and allergies by ID',
        category: 'patient',
        inputSchema: GetPatientSchema,
        requiredPermissions: ['patient:read'],
        handler: getPatientHandler,
    },
    {
        name: 'search_patients',
        description: 'Search patients by name, MRN, or other criteria with pagination',
        category: 'patient',
        inputSchema: SearchPatientsSchema,
        requiredPermissions: ['patient:read'],
        handler: searchPatientsHandler,
    },
    {
        name: 'get_patient_medications',
        description: 'Get all medications for a patient, optionally filtered to active only',
        category: 'patient',
        inputSchema: GetPatientMedicationsSchema,
        requiredPermissions: ['patient:read', 'medication:read'],
        handler: getPatientMedicationsHandler,
    },
    {
        name: 'get_patient_allergies',
        description: 'Get documented allergies for a patient (critical for safety checks)',
        category: 'patient',
        inputSchema: GetPatientAllergiesSchema,
        requiredPermissions: ['patient:read', 'allergy:read'],
        handler: getPatientAllergiesHandler,
    },
    {
        name: 'get_patient_conditions',
        description: 'Get active diagnoses and conditions for a patient',
        category: 'patient',
        inputSchema: GetPatientConditionsSchema,
        requiredPermissions: ['patient:read', 'condition:read'],
        handler: getPatientConditionsHandler,
    },
];
