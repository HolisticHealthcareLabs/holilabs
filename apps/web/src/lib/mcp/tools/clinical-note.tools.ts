/**
 * Clinical Note MCP Tools - Note creation and retrieval for agents
 * 
 * Schema: ClinicalNote uses `type` (NoteType enum), not `noteType` or `status`.
 * Status is inferred from `signedAt` field.
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import {
    CreateClinicalNoteSchema,
    GetClinicalNotesSchema,
    UpdateClinicalNoteSchema,
    type CreateClinicalNoteInput,
    type GetClinicalNotesInput,
    type UpdateClinicalNoteInput,
} from '../schemas/tool-schemas';
import type { MCPTool, MCPContext, MCPResult } from '../types';
import crypto from 'crypto';

// Map our schema types to Prisma NoteType enum
const NOTE_TYPE_MAP: Record<string, string> = {
    'SOAP': 'PROGRESS',
    'PROGRESS': 'PROGRESS',
    'PROCEDURE': 'PROCEDURE',
    'CONSULT': 'CONSULTATION',
    'DISCHARGE': 'DISCHARGE',
    'H_AND_P': 'ADMISSION',
};

// =============================================================================
// TOOL: create_clinical_note
// =============================================================================

async function createClinicalNoteHandler(
    input: CreateClinicalNoteInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Generate note hash for blockchain integrity
    const noteContent = JSON.stringify({
        subjective: input.subjective,
        objective: input.objective,
        assessment: input.assessment,
        plan: input.plan,
        content: input.content,
        timestamp: Date.now(),
    });
    const noteHash = crypto.createHash('sha256').update(noteContent).digest('hex');

    // Map note type to Prisma enum
    const prismaType = NOTE_TYPE_MAP[input.noteType] || 'PROGRESS';

    // Create note (signedAt = null means unsigned/draft)
    const note: any = await prisma.clinicalNote.create({
        data: {
            patientId: input.patientId,
            authorId: context.clinicianId,
            type: prismaType as any,
            noteHash,
            chiefComplaint: input.chiefComplaint,
            subjective: input.subjective,
            objective: input.objective,
            assessment: input.assessment,
            plan: input.plan,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'create_clinical_note',
        patientId: input.patientId,
        noteId: note.id,
        type: prismaType,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            noteId: note.id,
            status: 'DRAFT', // signedAt is null
            message: 'Clinical note created. Requires clinician review and signature.',
            patientId: input.patientId,
            type: prismaType,
            createdAt: note.createdAt,
        },
    };
}

// =============================================================================
// TOOL: get_clinical_notes
// =============================================================================

async function getClinicalNotesHandler(
    input: GetClinicalNotesInput,
    context: MCPContext
): Promise<MCPResult> {
    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: { id: input.patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    const where: any = { patientId: input.patientId };
    if (input.noteType) {
        const prismaType = NOTE_TYPE_MAP[input.noteType];
        if (prismaType) where.type = prismaType;
    }

    const notes: any[] = await prisma.clinicalNote.findMany({
        where,
        take: input.limit,
        orderBy: { createdAt: 'desc' },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_clinical_notes',
        patientId: input.patientId,
        count: notes.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            notes: notes.map((n: any) => ({
                id: n.id,
                type: n.type,
                status: n.signedAt ? 'SIGNED' : 'DRAFT',
                chiefComplaint: n.chiefComplaint,
                authorId: n.authorId,
                createdAt: n.createdAt,
                signedAt: n.signedAt,
                ...(input.includeContent ? {
                    subjective: n.subjective,
                    objective: n.objective,
                    assessment: n.assessment,
                    plan: n.plan,
                } : {}),
            })),
            total: notes.length,
        },
    };
}

// =============================================================================
// TOOL: update_clinical_note
// =============================================================================

async function updateClinicalNoteHandler(
    input: UpdateClinicalNoteInput,
    context: MCPContext
): Promise<MCPResult> {
    // Find the note and verify access
    const existingNote: any = await prisma.clinicalNote.findFirst({
        where: { id: input.noteId },
        include: { patient: true },
    });

    if (!existingNote) {
        return { success: false, error: 'Note not found', data: null };
    }

    if (existingNote.patient?.assignedClinicianId !== context.clinicianId) {
        return { success: false, error: 'Access denied', data: null };
    }

    // Only allow updates to unsigned notes
    if (existingNote.signedAt) {
        return {
            success: false,
            error: 'Cannot modify signed notes. Create an addendum instead.',
            data: null,
        };
    }

    const updateData: any = {};
    if (input.subjective !== undefined) updateData.subjective = input.subjective;
    if (input.objective !== undefined) updateData.objective = input.objective;
    if (input.assessment !== undefined) updateData.assessment = input.assessment;
    if (input.plan !== undefined) updateData.plan = input.plan;

    const note: any = await prisma.clinicalNote.update({
        where: { id: input.noteId },
        data: updateData,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_clinical_note',
        noteId: input.noteId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            noteId: note.id,
            status: 'DRAFT',
            message: 'Note updated. Still requires clinician signature.',
            updatedAt: note.updatedAt,
        },
    };
}

// =============================================================================
// EXPORT: Clinical Note Tools
// =============================================================================

export const clinicalNoteTools: MCPTool[] = [
    {
        name: 'create_clinical_note',
        description: 'Create a new clinical note (unsigned/draft). Requires clinician signature to finalize.',
        category: 'clinical-note',
        inputSchema: CreateClinicalNoteSchema,
        requiredPermissions: ['note:write', 'patient:read'],
        handler: createClinicalNoteHandler,
    },
    {
        name: 'get_clinical_notes',
        description: 'Retrieve clinical notes for a patient with optional filtering by type',
        category: 'clinical-note',
        inputSchema: GetClinicalNotesSchema,
        requiredPermissions: ['note:read', 'patient:read'],
        handler: getClinicalNotesHandler,
    },
    {
        name: 'update_clinical_note',
        description: 'Update an unsigned clinical note. Cannot modify signed notes.',
        category: 'clinical-note',
        inputSchema: UpdateClinicalNoteSchema,
        requiredPermissions: ['note:write'],
        handler: updateClinicalNoteHandler,
    },
];
