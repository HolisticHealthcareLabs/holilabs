/**
 * Prescription MCP Tools - Pharmacy integration and prescription management for agents
 *
 * Primitives following agent-native architecture:
 * - send_to_pharmacy: Send prescription to pharmacy with delivery preference
 * - get_prescription_status: Get current status and fill history
 * - refill_medication: Create new prescription as refill from existing medication
 * - list_prescriptions: List patient prescriptions with optional filters
 * - update_prescription_status: Update prescription status with audit trail
 *
 * Uses `any` types for complex Prisma queries.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// SCHEMAS
// =============================================================================

const SendToPharmacySchema = z.object({
    prescriptionId: z.string().uuid().describe('The prescription ID to send'),
    pharmacyId: z.string().uuid().optional().describe('Target pharmacy ID (optional - uses patient default if not provided)'),
    deliveryMethod: z.enum(['pickup', 'delivery']).describe('How patient will receive medication'),
});

const GetPrescriptionStatusSchema = z.object({
    prescriptionId: z.string().uuid().describe('The prescription ID to check'),
});

const RefillMedicationSchema = z.object({
    medicationId: z.string().uuid().describe('The existing medication ID to refill'),
    patientId: z.string().uuid().describe('The patient ID for verification'),
    quantity: z.number().int().positive().optional().describe('Quantity to dispense (uses default if not provided)'),
});

const ListPrescriptionsSchema = z.object({
    patientId: z.string().uuid().describe('The patient ID to list prescriptions for'),
    status: z.enum(['PENDING', 'SIGNED', 'SENT', 'FILLED', 'CANCELLED']).optional().describe('Filter by status'),
    dateRange: z.object({
        from: z.string().describe('Start date (ISO format)'),
        to: z.string().describe('End date (ISO format)'),
    }).optional().describe('Filter by date range'),
    page: z.number().int().min(1).default(1).describe('Page number'),
    limit: z.number().int().min(1).max(50).default(20).describe('Items per page'),
});

const UpdatePrescriptionStatusSchema = z.object({
    prescriptionId: z.string().uuid().describe('The prescription ID to update'),
    status: z.enum(['PENDING', 'SIGNED', 'SENT', 'FILLED', 'CANCELLED']).describe('New status'),
    notes: z.string().optional().describe('Notes for the status change'),
});

type SendToPharmacyInput = z.infer<typeof SendToPharmacySchema>;
type GetPrescriptionStatusInput = z.infer<typeof GetPrescriptionStatusSchema>;
type RefillMedicationInput = z.infer<typeof RefillMedicationSchema>;
type ListPrescriptionsInput = z.infer<typeof ListPrescriptionsSchema>;
type UpdatePrescriptionStatusInput = z.infer<typeof UpdatePrescriptionStatusSchema>;

// =============================================================================
// PRIMITIVE: send_to_pharmacy
// Updates prescription status to sent and records pharmacy/delivery preference
// =============================================================================

async function sendToPharmacyHandler(
    input: SendToPharmacyInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify prescription exists and belongs to clinician's patient
    const prescription: any = await prisma.prescription.findFirst({
        where: { id: input.prescriptionId },
        include: { patient: { select: { id: true, assignedClinicianId: true } } },
    });

    if (!prescription) {
        return { success: false, error: 'Prescription not found', data: null };
    }

    if (prescription.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    if (prescription.status === 'CANCELLED') {
        return { success: false, error: 'Cannot send cancelled prescription', data: null };
    }

    if (prescription.sentToPharmacy) {
        return { success: false, error: 'Prescription already sent to pharmacy', data: null };
    }

    // Map delivery method to Prisma enum
    const deliveryMethodMap: Record<string, string> = {
        pickup: 'PICKUP',
        delivery: 'HOME_DELIVERY',
    };

    // Update prescription
    const updated: any = await prisma.prescription.update({
        where: { id: input.prescriptionId },
        data: {
            status: 'SENT',
            sentToPharmacy: true,
            pharmacyId: input.pharmacyId || null,
        },
    });

    // Create pharmacy prescription record if pharmacyId provided
    if (input.pharmacyId) {
        await prisma.pharmacyPrescription.create({
            data: {
                prescriptionId: input.prescriptionId,
                pharmacyId: input.pharmacyId,
                status: 'SENT',
                deliveryMethod: deliveryMethodMap[input.deliveryMethod] as any,
                sentAt: new Date(),
            },
        });
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'send_to_pharmacy',
        prescriptionId: input.prescriptionId,
        pharmacyId: input.pharmacyId,
        deliveryMethod: input.deliveryMethod,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            prescriptionId: updated.id,
            status: updated.status,
            sentToPharmacy: updated.sentToPharmacy,
            pharmacyId: input.pharmacyId || null,
            deliveryMethod: input.deliveryMethod,
            sentAt: new Date().toISOString(),
        },
    };
}

// =============================================================================
// PRIMITIVE: get_prescription_status
// Returns current status, pharmacy info, and fill history
// =============================================================================

async function getPrescriptionStatusHandler(
    input: GetPrescriptionStatusInput,
    context: MCPContext
): Promise<MCPResult> {
    const prescription: any = await prisma.prescription.findFirst({
        where: { id: input.prescriptionId },
        include: {
            patient: { select: { id: true, assignedClinicianId: true, firstName: true, lastName: true } },
            clinician: { select: { id: true, firstName: true, lastName: true } },
            dispenses: {
                orderBy: { dispensedAt: 'desc' },
                select: {
                    id: true,
                    pharmacyName: true,
                    medicationName: true,
                    quantity: true,
                    fillNumber: true,
                    isRefill: true,
                    status: true,
                    dispensedAt: true,
                    pickupDate: true,
                },
            },
        },
    });

    if (!prescription) {
        return { success: false, error: 'Prescription not found', data: null };
    }

    if (prescription.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    // Get pharmacy prescription info if sent
    let pharmacyInfo = null;
    if (prescription.sentToPharmacy && prescription.pharmacyId) {
        const pharmacyPrescription: any = await prisma.pharmacyPrescription.findFirst({
            where: { prescriptionId: input.prescriptionId },
            include: { pharmacy: { select: { id: true, name: true, phone: true, address: true } } },
            orderBy: { sentAt: 'desc' },
        });
        if (pharmacyPrescription) {
            pharmacyInfo = {
                pharmacy: pharmacyPrescription.pharmacy,
                pharmacyOrderId: pharmacyPrescription.pharmacyOrderId,
                status: pharmacyPrescription.status,
                deliveryMethod: pharmacyPrescription.deliveryMethod,
                sentAt: pharmacyPrescription.sentAt,
                readyAt: pharmacyPrescription.readyAt,
                pickedUpAt: pharmacyPrescription.pickedUpAt,
            };
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_prescription_status',
        prescriptionId: input.prescriptionId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            id: prescription.id,
            patientId: prescription.patientId,
            patientName: `${prescription.patient?.firstName} ${prescription.patient?.lastName}`,
            clinicianId: prescription.clinicianId,
            clinicianName: `${prescription.clinician?.firstName} ${prescription.clinician?.lastName}`,
            status: prescription.status,
            medications: prescription.medications,
            instructions: prescription.instructions,
            diagnosis: prescription.diagnosis,
            refillsAuthorized: prescription.refillsAuthorized,
            refillsRemaining: prescription.refillsRemaining,
            daysSupply: prescription.daysSupply,
            sentToPharmacy: prescription.sentToPharmacy,
            pharmacyInfo,
            fillHistory: prescription.dispenses,
            signedAt: prescription.signedAt,
            createdAt: prescription.createdAt,
            updatedAt: prescription.updatedAt,
        },
    };
}

// =============================================================================
// PRIMITIVE: refill_medication
// Creates new prescription based on existing medication, links as refill
// =============================================================================

async function refillMedicationHandler(
    input: RefillMedicationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify medication exists and belongs to clinician's patient
    const medication: any = await prisma.medication.findFirst({
        where: { id: input.medicationId },
        include: {
            patient: { select: { id: true, assignedClinicianId: true } },
            prescription: true,
        },
    });

    if (!medication) {
        return { success: false, error: 'Medication not found', data: null };
    }

    if (medication.patientId !== input.patientId) {
        return { success: false, error: 'Medication does not belong to specified patient', data: null };
    }

    if (medication.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    if (!medication.isActive) {
        return { success: false, error: 'Cannot refill inactive medication', data: null };
    }

    // Check if original prescription has refills remaining
    if (medication.prescription && medication.prescription.refillsRemaining <= 0) {
        return {
            success: false,
            error: 'No refills remaining on original prescription',
            data: {
                originalPrescriptionId: medication.prescription.id,
                refillsRemaining: 0,
            },
        };
    }

    // Generate prescription hash (simplified - production would use proper hash)
    const prescriptionData = {
        patientId: input.patientId,
        medicationId: input.medicationId,
        medicationName: medication.name,
        dose: medication.dose,
        frequency: medication.frequency,
        timestamp: Date.now(),
    };
    const prescriptionHash = Buffer.from(JSON.stringify(prescriptionData)).toString('base64');

    // Create new prescription as refill
    const newPrescription: any = await prisma.prescription.create({
        data: {
            patientId: input.patientId,
            clinicianId: context.clinicianId,
            prescriptionHash,
            medications: [{
                name: medication.name,
                dose: medication.dose,
                frequency: medication.frequency,
                route: medication.route,
                quantity: input.quantity,
            }],
            instructions: medication.instructions,
            refillsAuthorized: 0, // Refills don't get additional refills by default
            refillsRemaining: 0,
            daysSupply: medication.prescription?.daysSupply || 30,
            signatureMethod: 'pin',
            signatureData: 'REFILL_AUTO',
            status: 'PENDING',
        },
    });

    // Update original prescription refills remaining if applicable
    if (medication.prescription) {
        await prisma.prescription.update({
            where: { id: medication.prescription.id },
            data: {
                refillsRemaining: { decrement: 1 },
            },
        });
    }

    // Link new medication record to new prescription
    await prisma.medication.create({
        data: {
            patientId: input.patientId,
            name: medication.name,
            genericName: medication.genericName,
            dose: medication.dose,
            frequency: medication.frequency,
            route: medication.route,
            instructions: medication.instructions,
            isActive: false, // Starts inactive until approved
            prescribedBy: context.clinicianId,
            prescriptionId: newPrescription.id,
            notes: `Refill of medication ${medication.id}`,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'refill_medication',
        medicationId: input.medicationId,
        patientId: input.patientId,
        newPrescriptionId: newPrescription.id,
        originalPrescriptionId: medication.prescription?.id,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            prescriptionId: newPrescription.id,
            originalMedicationId: input.medicationId,
            originalPrescriptionId: medication.prescription?.id || null,
            medicationName: medication.name,
            dose: medication.dose,
            frequency: medication.frequency,
            status: newPrescription.status,
            createdAt: newPrescription.createdAt,
        },
    };
}

// =============================================================================
// PRIMITIVE: list_prescriptions
// Returns paginated list of prescriptions with optional filters
// =============================================================================

async function listPrescriptionsHandler(
    input: ListPrescriptionsInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
        select: { id: true },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Build query filters
    const where: any = { patientId: input.patientId };

    if (input.status) {
        where.status = input.status;
    }

    if (input.dateRange) {
        where.createdAt = {
            gte: new Date(input.dateRange.from),
            lte: new Date(input.dateRange.to),
        };
    }

    // Get total count
    const totalCount = await prisma.prescription.count({ where });

    // Get paginated results
    const prescriptions: any[] = await prisma.prescription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: {
            clinician: { select: { id: true, firstName: true, lastName: true } },
            dispenses: {
                take: 1,
                orderBy: { dispensedAt: 'desc' },
                select: { status: true, dispensedAt: true },
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_prescriptions',
        patientId: input.patientId,
        resultCount: prescriptions.length,
        totalCount,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            prescriptions: prescriptions.map(p => ({
                id: p.id,
                status: p.status,
                medications: p.medications,
                clinicianName: `${p.clinician?.firstName} ${p.clinician?.lastName}`,
                refillsRemaining: p.refillsRemaining,
                sentToPharmacy: p.sentToPharmacy,
                latestDispense: p.dispenses[0] || null,
                signedAt: p.signedAt,
                createdAt: p.createdAt,
            })),
            pagination: {
                page: input.page,
                limit: input.limit,
                totalCount,
                totalPages: Math.ceil(totalCount / input.limit),
            },
        },
    };
}

// =============================================================================
// PRIMITIVE: update_prescription_status
// Updates prescription status with audit trail
// =============================================================================

async function updatePrescriptionStatusHandler(
    input: UpdatePrescriptionStatusInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify prescription exists and belongs to clinician's patient
    const prescription: any = await prisma.prescription.findFirst({
        where: { id: input.prescriptionId },
        include: { patient: { select: { id: true, assignedClinicianId: true } } },
    });

    if (!prescription) {
        return { success: false, error: 'Prescription not found', data: null };
    }

    if (prescription.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    const previousStatus = prescription.status;

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
        PENDING: ['SIGNED', 'CANCELLED'],
        SIGNED: ['SENT', 'CANCELLED'],
        SENT: ['FILLED', 'CANCELLED'],
        FILLED: ['CANCELLED'],
        CANCELLED: [],
    };

    if (!validTransitions[previousStatus]?.includes(input.status)) {
        return {
            success: false,
            error: `Invalid status transition from ${previousStatus} to ${input.status}`,
            data: { validTransitions: validTransitions[previousStatus] },
        };
    }

    // Update prescription
    const updated: any = await prisma.prescription.update({
        where: { id: input.prescriptionId },
        data: {
            status: input.status,
            // Update sentToPharmacy flag if status is SENT
            ...(input.status === 'SENT' && { sentToPharmacy: true }),
        },
    });

    // Create audit log entry
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            action: 'UPDATE',
            resource: 'Prescription',
            resourceId: input.prescriptionId,
            ipAddress: 'mcp-agent', // MCP tool execution context
            details: {
                operation: 'UPDATE_PRESCRIPTION_STATUS',
                previousStatus,
                newStatus: input.status,
                notes: input.notes || null,
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_prescription_status',
        prescriptionId: input.prescriptionId,
        previousStatus,
        newStatus: input.status,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            prescriptionId: updated.id,
            previousStatus,
            newStatus: updated.status,
            notes: input.notes || null,
            updatedAt: updated.updatedAt,
        },
    };
}

// =============================================================================
// EXPORT: Prescription Tools
// =============================================================================

export const prescriptionTools: MCPTool[] = [
    {
        name: 'send_to_pharmacy',
        description: 'Send a prescription to a pharmacy with delivery preference. Updates status to SENT and records pharmacy/delivery info.',
        category: 'medication',
        inputSchema: SendToPharmacySchema,
        requiredPermissions: ['prescription:write', 'patient:read'],
        handler: sendToPharmacyHandler,
    },
    {
        name: 'get_prescription_status',
        description: 'Get current prescription status including pharmacy info and complete fill history.',
        category: 'medication',
        inputSchema: GetPrescriptionStatusSchema,
        requiredPermissions: ['prescription:read', 'patient:read'],
        handler: getPrescriptionStatusHandler,
    },
    {
        name: 'refill_medication',
        description: 'Create a new prescription as a refill from an existing active medication. Links to original prescription and decrements refills remaining.',
        category: 'medication',
        inputSchema: RefillMedicationSchema,
        requiredPermissions: ['prescription:write', 'medication:read', 'patient:read'],
        handler: refillMedicationHandler,
    },
    {
        name: 'list_prescriptions',
        description: 'List prescriptions for a patient with optional status and date filters. Returns paginated results.',
        category: 'medication',
        inputSchema: ListPrescriptionsSchema,
        requiredPermissions: ['prescription:read', 'patient:read'],
        handler: listPrescriptionsHandler,
    },
    {
        name: 'update_prescription_status',
        description: 'Update prescription status with validation and audit trail. Enforces valid status transitions.',
        category: 'medication',
        inputSchema: UpdatePrescriptionStatusSchema,
        requiredPermissions: ['prescription:write', 'patient:read'],
        handler: updatePrescriptionStatusHandler,
    },
];
