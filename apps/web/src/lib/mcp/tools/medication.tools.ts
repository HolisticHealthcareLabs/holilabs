/**
 * Medication MCP Tools - Prescription and interaction checking for agents
 *
 * REFACTORED: Decomposed into pure primitives per agent-native architecture audit.
 * Business logic (safety checks, BLOCKED decisions) removed from create operations.
 *
 * Primitives:
 * - create_medication_draft: Pure create operation, no safety checks
 * - get_interaction_data: Returns raw interaction data, no summary
 * - get_medication_by_id: Fetch single medication record
 *
 * Legacy (deprecated):
 * - prescribe_medication: Still available but marked deprecated
 *
 * Uses `any` types for complex Prisma queries.
 */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FAST_LANE_RULES } from '@/lib/governance/governance.rules';
import jsonLogic from 'json-logic-js';
import {
    PrescribeMedicationSchema,
    GetMedicationInteractionsSchema,
    DiscontinueMedicationSchema,
    UpdateMedicationSchema,
    type PrescribeMedicationInput,
    type GetMedicationInteractionsInput,
    type DiscontinueMedicationInput,
    type UpdateMedicationInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';

// =============================================================================
// PRIMITIVE SCHEMAS
// =============================================================================

const CreateMedicationDraftSchema = z.object({
    patientId: z.string().uuid().describe('The patient to create medication for'),
    medicationName: z.string().describe('Name of the medication'),
    dosage: z.string().describe('Dosage (e.g., "10mg")'),
    frequency: z.string().describe('Frequency (e.g., "twice daily", "q8h")'),
    route: z.enum(['oral', 'iv', 'im', 'subq', 'topical', 'inhalation', 'rectal', 'other']).default('oral'),
    instructions: z.string().optional().describe('Special instructions'),
    indication: z.string().optional().describe('Reason for prescribing'),
    notes: z.string().optional().describe('Additional notes'),
});

const GetInteractionDataSchema = z.object({
    medications: z.array(z.string()).min(1).describe('List of medication names to check'),
});

const GetMedicationByIdSchema = z.object({
    medicationId: z.string().uuid().describe('The medication record ID'),
});

type CreateMedicationDraftInput = z.infer<typeof CreateMedicationDraftSchema>;
type GetInteractionDataInput = z.infer<typeof GetInteractionDataSchema>;
type GetMedicationByIdInput = z.infer<typeof GetMedicationByIdSchema>;

// Common drug interaction map (subset - production would use RxNorm API)
const KNOWN_INTERACTIONS: Record<string, string[]> = {
    warfarin: ['aspirin', 'ibuprofen', 'naproxen', 'vitamin k'],
    metformin: ['alcohol', 'contrast dye'],
    lisinopril: ['potassium', 'spironolactone'],
    opioid: ['benzodiazepine', 'alcohol'],
    ssri: ['maoi', 'tramadol'],
};

// =============================================================================
// PRIMITIVE: create_medication_draft
// Creates medication record without safety checks - agent handles safety separately
// =============================================================================

async function createMedicationDraftHandler(
    input: CreateMedicationDraftInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access only
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
        select: { id: true },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Pure create operation - no safety checks embedded
    const medication: any = await prisma.medication.create({
        data: {
            patientId: input.patientId,
            name: input.medicationName,
            dose: input.dosage,
            frequency: input.frequency,
            route: input.route,
            isActive: false, // Always starts inactive
            instructions: input.instructions,
            prescribedBy: context.clinicianId,
            notes: input.notes,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_medication_draft',
        patientId: input.patientId,
        medicationId: medication.id,
        medicationName: input.medicationName,
        agentId: context.agentId,
    });

    // Return raw data - no status messages or recommendations
    return {
        success: true,
        data: {
            medicationId: medication.id,
            patientId: medication.patientId,
            name: medication.name,
            dose: medication.dose,
            frequency: medication.frequency,
            route: medication.route,
            isActive: medication.isActive,
            instructions: medication.instructions,
            prescribedBy: medication.prescribedBy,
            createdAt: medication.createdAt,
        },
    };
}

// =============================================================================
// PRIMITIVE: get_interaction_data
// Returns raw interaction pairs - no summary or hasHighRisk flag
// =============================================================================

async function getInteractionDataHandler(
    input: GetInteractionDataInput,
    context: MCPContext
): Promise<MCPResult> {
    const { medications } = input;
    const interactionPairs: Array<{
        drug1: string;
        drug2: string;
        interactionType: string;
        knownSeverity: 'high' | 'moderate' | 'low';
    }> = [];

    // Find all potential interaction pairs
    for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
            const drug1 = medications[i].toLowerCase();
            const drug2 = medications[j].toLowerCase();

            for (const [drug, interactsWith] of Object.entries(KNOWN_INTERACTIONS)) {
                if (
                    (drug1.includes(drug) && interactsWith.some(d => drug2.includes(d))) ||
                    (drug2.includes(drug) && interactsWith.some(d => drug1.includes(d)))
                ) {
                    interactionPairs.push({
                        drug1: medications[i],
                        drug2: medications[j],
                        interactionType: drug,
                        knownSeverity: drug === 'opioid' || drug === 'warfarin' ? 'high' : 'moderate',
                    });
                }
            }
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_interaction_data',
        medicationCount: medications.length,
        interactionCount: interactionPairs.length,
        agentId: context.agentId,
    });

    // Return raw data - no summary, no hasHighRisk boolean
    return {
        success: true,
        data: {
            queriedMedications: medications,
            interactionPairs,
            pairCount: interactionPairs.length,
        },
    };
}

// =============================================================================
// PRIMITIVE: get_medication_by_id
// Fetch single medication record
// =============================================================================

async function getMedicationByIdHandler(
    input: GetMedicationByIdInput,
    context: MCPContext
): Promise<MCPResult> {
    const medication: any = await prisma.medication.findFirst({
        where: { id: input.medicationId },
        include: { patient: { select: { id: true, assignedClinicianId: true } } },
    });

    if (!medication) {
        return { success: false, error: 'Medication not found', data: null };
    }

    if (medication.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_medication_by_id',
        medicationId: input.medicationId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            id: medication.id,
            patientId: medication.patientId,
            name: medication.name,
            dose: medication.dose,
            frequency: medication.frequency,
            route: medication.route,
            isActive: medication.isActive,
            instructions: medication.instructions,
            prescribedBy: medication.prescribedBy,
            startDate: medication.startDate,
            endDate: medication.endDate,
            notes: medication.notes,
            createdAt: medication.createdAt,
            updatedAt: medication.updatedAt,
        },
    };
}

// =============================================================================
// LEGACY TOOL: prescribe_medication (DEPRECATED)
// Kept for backward compatibility - use primitives instead
// =============================================================================

async function prescribeMedicationHandler(
    input: PrescribeMedicationInput,
    context: MCPContext
): Promise<MCPResult> {
    logger.warn({
        event: 'deprecated_tool_called',
        tool: 'prescribe_medication',
        message: 'Use create_medication_draft + match_contraindications (governance) primitives instead',
        agentId: context.agentId,
    });

    // Verify patient access with any type for complex relations
    const patient: any = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
        include: {
            diagnoses: true,
            allergies: true,
            medications: true,
        },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Run safety check before creating prescription
    const ruleContext = {
        proposedMedication: input.medicationName.toLowerCase(),
        conditions: (patient.diagnoses || []).map((d: any) => (d.description || '').toLowerCase()),
        allergies: (patient.allergies || []).map((a: any) => (a.allergen || '').toLowerCase()),
        currentMedications: (patient.medications || []).map((m: any) => (m.name || '').toLowerCase()),
    };

    const violations = FAST_LANE_RULES.filter(rule => {
        try {
            return jsonLogic.apply(rule.logic, ruleContext);
        } catch {
            return false;
        }
    });

    const hasHardBlock = violations.some(v => v.severity === 'HARD_BLOCK');

    if (hasHardBlock) {
        logger.warn({
            event: 'prescription_blocked',
            patientId: input.patientId,
            medication: input.medicationName,
            violations: violations.map(v => v.ruleId),
            agentId: context.agentId,
        });

        return {
            success: false,
            error: 'Prescription blocked due to contraindication',
            data: {
                violations: violations.map(v => ({
                    ruleId: v.ruleId,
                    name: v.name,
                    severity: v.severity,
                    message: (v.intervention as any)?.message,
                })),
                recommendation: 'Review contraindications and consider alternative therapy.',
            },
        };
    }

    // Create medication order (isActive: false until clinician approves)
    const medication: any = await prisma.medication.create({
        data: {
            patientId: input.patientId,
            name: input.medicationName,
            dose: input.dosage,
            frequency: input.frequency,
            route: input.route,
            isActive: false, // Requires clinician approval
            instructions: input.instructions,
            prescribedBy: context.clinicianId,
            notes: violations.length > 0 ? `Warnings: ${violations.map(v => v.name).join('; ')}` : undefined,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'prescribe_medication',
        patientId: input.patientId,
        medicationId: medication.id,
        medicationName: input.medicationName,
        softWarnings: violations.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            medicationId: medication.id,
            status: 'PENDING_APPROVAL',
            message: violations.length > 0
                ? 'Prescription created with warnings. Requires clinician review.'
                : 'Prescription created. Requires clinician approval.',
            warnings: violations.map(v => ({
                ruleId: v.ruleId,
                message: (v.intervention as any)?.message,
            })),
        },
    };
}

// =============================================================================
// TOOL: get_medication_interactions
// =============================================================================

async function getMedicationInteractionsHandler(
    input: GetMedicationInteractionsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { medications } = input;
    const interactions: Array<{
        drug1: string;
        drug2: string;
        severity: 'high' | 'moderate' | 'low';
        description: string;
    }> = [];

    for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
            const drug1 = medications[i].toLowerCase();
            const drug2 = medications[j].toLowerCase();

            for (const [drug, interactsWith] of Object.entries(KNOWN_INTERACTIONS)) {
                if (
                    (drug1.includes(drug) && interactsWith.some(d => drug2.includes(d))) ||
                    (drug2.includes(drug) && interactsWith.some(d => drug1.includes(d)))
                ) {
                    interactions.push({
                        drug1: medications[i],
                        drug2: medications[j],
                        severity: drug === 'opioid' || drug === 'warfarin' ? 'high' : 'moderate',
                        description: `Potential interaction between ${drug} and interacting agent`,
                    });
                }
            }
        }
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_medication_interactions',
        medicationCount: medications.length,
        interactionCount: interactions.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            medications,
            interactions,
            hasHighRisk: interactions.some(i => i.severity === 'high'),
            summary: interactions.length === 0
                ? 'No known interactions detected.'
                : `Found ${interactions.length} potential interaction(s).`,
        },
    };
}

// =============================================================================
// TOOL: discontinue_medication
// =============================================================================

async function discontinueMedicationHandler(
    input: DiscontinueMedicationInput,
    context: MCPContext
): Promise<MCPResult> {
    const medication: any = await prisma.medication.findFirst({
        where: { id: input.medicationId },
        include: { patient: true },
    });

    if (!medication) {
        return { success: false, error: 'Medication not found', data: null };
    }

    if (medication.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    if (!medication.isActive) {
        return { success: false, error: 'Medication is already inactive', data: null };
    }

    const updated: any = await prisma.medication.update({
        where: { id: input.medicationId },
        data: {
            isActive: false,
            endDate: new Date(),
            notes: medication.notes
                ? `${medication.notes}\nDiscontinued: ${input.reason}`
                : `Discontinued: ${input.reason}`,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'discontinue_medication',
        medicationId: input.medicationId,
        medicationName: medication.name,
        reason: input.reason,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            medicationId: updated.id,
            medicationName: medication.name,
            previousStatus: 'ACTIVE',
            newStatus: 'DISCONTINUED',
            reason: input.reason,
            discontinuedAt: updated.endDate,
        },
    };
}

// =============================================================================
// PRIMITIVE: update_medication
// Update medication details (dose, frequency, instructions, notes, isActive, route)
// =============================================================================

async function updateMedicationHandler(
    input: UpdateMedicationInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find medication and verify access
    const medication: any = await prisma.medication.findFirst({
        where: { id: input.medicationId },
        include: { patient: { select: { id: true, assignedClinicianId: true } } },
    });

    if (!medication) {
        return { success: false, error: 'Medication not found', data: null };
    }

    if (medication.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    // Build update data with only provided fields
    const updateData: Record<string, any> = {};
    if (input.dose !== undefined) updateData.dose = input.dose;
    if (input.frequency !== undefined) updateData.frequency = input.frequency;
    if (input.instructions !== undefined) updateData.instructions = input.instructions;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.route !== undefined) updateData.route = input.route;

    // Check if any updates were provided
    if (Object.keys(updateData).length === 0) {
        return {
            success: false,
            error: 'No update fields provided',
            data: null,
        };
    }

    const updated: any = await prisma.medication.update({
        where: { id: input.medicationId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_medication',
        medicationId: input.medicationId,
        medicationName: medication.name,
        updatedFields: Object.keys(updateData),
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            medicationId: updated.id,
            patientId: updated.patientId,
            name: updated.name,
            dose: updated.dose,
            frequency: updated.frequency,
            route: updated.route,
            isActive: updated.isActive,
            instructions: updated.instructions,
            notes: updated.notes,
            updatedAt: updated.updatedAt,
        },
    };
}

// =============================================================================
// EXPORT: Medication Tools
// =============================================================================

export const medicationTools: MCPTool[] = [
    // ==========================================================================
    // PRIMITIVE TOOLS (Agent-native architecture)
    // ==========================================================================
    {
        name: 'create_medication_draft',
        description: 'Create a medication record in draft/inactive state. No safety checks - agent should call match_contraindications first. Returns raw medication data.',
        category: 'medication',
        inputSchema: CreateMedicationDraftSchema,
        requiredPermissions: ['medication:write', 'patient:read'],
        handler: createMedicationDraftHandler,
    },
    {
        name: 'get_interaction_data',
        description: 'Get raw drug-drug interaction pairs for a list of medications. Returns interaction data without summary or recommendations - agent interprets.',
        category: 'medication',
        inputSchema: GetInteractionDataSchema,
        requiredPermissions: ['medication:read'],
        handler: getInteractionDataHandler,
    },
    {
        name: 'get_medication_by_id',
        description: 'Fetch a single medication record by ID. Returns complete medication data.',
        category: 'medication',
        inputSchema: GetMedicationByIdSchema,
        requiredPermissions: ['medication:read'],
        handler: getMedicationByIdHandler,
    },
    {
        name: 'discontinue_medication',
        description: 'Discontinue an active medication order with reason',
        category: 'medication',
        inputSchema: DiscontinueMedicationSchema,
        requiredPermissions: ['medication:write'],
        handler: discontinueMedicationHandler,
    },
    {
        name: 'update_medication',
        description: 'Update medication details including dose, frequency, instructions, notes, active status, or route. Pure update operation.',
        category: 'medication',
        inputSchema: UpdateMedicationSchema,
        requiredPermissions: ['medication:write'],
        handler: updateMedicationHandler,
    },
    // ==========================================================================
    // LEGACY TOOLS (Deprecated - use primitives)
    // ==========================================================================
    {
        name: 'prescribe_medication',
        description: '[DEPRECATED: Use create_medication_draft + match_contraindications] Create medication with embedded safety checks.',
        category: 'medication',
        inputSchema: PrescribeMedicationSchema,
        requiredPermissions: ['medication:write', 'patient:read'],
        handler: prescribeMedicationHandler,
        deprecated: true,
        alternatives: ['create_medication_draft', 'match_contraindications'],
    },
    {
        name: 'get_medication_interactions',
        description: '[DEPRECATED: Use get_interaction_data] Check interactions with summary.',
        category: 'medication',
        inputSchema: GetMedicationInteractionsSchema,
        requiredPermissions: ['medication:read'],
        handler: getMedicationInteractionsHandler,
        deprecated: true,
        alternatives: ['get_interaction_data'],
    },
];
