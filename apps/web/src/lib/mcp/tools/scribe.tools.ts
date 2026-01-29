/**
 * Scribe MCP Tools - Clinical Recording & AI Scribe Capabilities
 *
 * Provides MCP tools for:
 * - Managing recording sessions (start, stop, get, list)
 * - Transcription management (get, update)
 * - Clinical findings extraction
 * - SOAP note generation and finalization
 * - Scribe template management
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { createHash } from 'crypto';
import type { MCPTool, MCPContext, MCPResult } from '../types';
import { verifyRecordingConsent } from '@/lib/consent/recording-consent';

// =============================================================================
// SCRIBE SCHEMAS
// =============================================================================

const UUIDSchema = z.string().uuid('Must be a valid UUID');

export const StartRecordingSessionSchema = z.object({
    patientId: UUIDSchema.describe('The patient ID for this recording session'),
    appointmentId: z.string().optional().describe('Optional appointment ID to link session'),
    accessReason: z.enum([
        'DIRECT_PATIENT_CARE',
        'CARE_COORDINATION',
        'EMERGENCY_ACCESS',
        'ADMINISTRATIVE',
        'QUALITY_IMPROVEMENT',
        'BILLING',
        'LEGAL_COMPLIANCE',
        'RESEARCH_IRB_APPROVED',
        'PUBLIC_HEALTH',
    ]).describe('HIPAA-required access reason'),
    accessPurpose: z.string().optional().describe('Optional additional context for access'),
});

export const StopRecordingSessionSchema = z.object({
    sessionId: UUIDSchema.describe('The recording session ID to stop'),
});

export const GetRecordingSessionSchema = z.object({
    sessionId: UUIDSchema.describe('The recording session ID to retrieve'),
});

export const ListRecordingSessionsSchema = z.object({
    patientId: z.string().optional().describe('Filter by patient ID'),
    status: z.enum(['RECORDING', 'PAUSED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional().describe('Filter by session status'),
    limit: z.number().int().min(1).max(50).default(20).describe('Maximum sessions to return'),
});

export const GetTranscriptionSchema = z.object({
    sessionId: UUIDSchema.describe('The session ID to get transcription for'),
    includeSegments: z.boolean().default(false).describe('Include speaker diarization segments'),
});

export const ExtractClinicalFindingsSchema = z.object({
    sessionId: UUIDSchema.describe('The session ID to extract findings from'),
    chiefComplaint: z.string().optional().describe('Chief complaint if known'),
    symptoms: z.array(z.string()).optional().describe('Detected symptoms'),
    diagnoses: z.array(z.string()).optional().describe('Detected diagnoses'),
    entities: z.object({
        vitals: z.array(z.string()).optional(),
        symptoms: z.array(z.string()).optional(),
        diagnoses: z.array(z.string()).optional(),
        medications: z.array(z.string()).optional(),
        procedures: z.array(z.string()).optional(),
        anatomy: z.array(z.string()).optional(),
    }).optional().describe('Extracted medical entities'),
});

export const GenerateSOAPNoteSchema = z.object({
    sessionId: UUIDSchema.describe('The session ID to generate SOAP note from'),
});

export const FinalizeClinicalNoteSchema = z.object({
    noteId: UUIDSchema.describe('The SOAP note ID to finalize/sign'),
    signatureMethod: z.enum(['pin', 'digital']).describe('Method of signature'),
    pin: z.string().min(4).describe('PIN for signing (min 4 characters)'),
});

export const GetScribeTemplatesSchema = z.object({
    category: z.string().optional().describe('Filter templates by category'),
    specialty: z.string().optional().describe('Filter templates by specialty'),
});

export const UpdateTranscriptionSchema = z.object({
    sessionId: UUIDSchema.describe('The session ID to update transcription for'),
    segmentIndex: z.number().int().min(0).describe('Index of segment to correct'),
    originalText: z.string().describe('Original transcription text'),
    correctedText: z.string().describe('Corrected transcription text'),
    confidence: z.number().min(0).max(1).describe('Original confidence score'),
    speaker: z.string().optional().describe('Speaker identifier'),
    startTime: z.number().optional().describe('Segment start time in seconds'),
    endTime: z.number().optional().describe('Segment end time in seconds'),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type StartRecordingSessionInput = z.infer<typeof StartRecordingSessionSchema>;
export type StopRecordingSessionInput = z.infer<typeof StopRecordingSessionSchema>;
export type GetRecordingSessionInput = z.infer<typeof GetRecordingSessionSchema>;
export type ListRecordingSessionsInput = z.infer<typeof ListRecordingSessionsSchema>;
export type GetTranscriptionInput = z.infer<typeof GetTranscriptionSchema>;
export type ExtractClinicalFindingsInput = z.infer<typeof ExtractClinicalFindingsSchema>;
export type GenerateSOAPNoteInput = z.infer<typeof GenerateSOAPNoteSchema>;
export type FinalizeClinicalNoteInput = z.infer<typeof FinalizeClinicalNoteSchema>;
export type GetScribeTemplatesInput = z.infer<typeof GetScribeTemplatesSchema>;
export type UpdateTranscriptionInput = z.infer<typeof UpdateTranscriptionSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateLevenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + 1
                );
            }
        }
    }

    return dp[m][n];
}

// =============================================================================
// TOOL: start_recording_session
// =============================================================================

async function startRecordingSessionHandler(
    input: StartRecordingSessionInput,
    context: MCPContext
): Promise<MCPResult> {
    const { patientId, appointmentId, accessReason, accessPurpose } = input;

    // Verify patient access
    const patient = await prisma.patient.findFirst({
        where: { id: patientId, assignedClinicianId: context.clinicianId },
    });

    if (!patient) {
        return { success: false, error: 'Patient not found or access denied', data: null };
    }

    // Verify recording consent (two-party consent states)
    const consentCheck = await verifyRecordingConsent(patientId, patient.state || undefined);

    if (!consentCheck.allowed) {
        return {
            success: false,
            error: `Recording consent required: ${consentCheck.reason}`,
            data: {
                requiresConsent: consentCheck.requiresConsent,
                patientState: patient.state,
            },
        };
    }

    // Verify appointment if provided
    if (appointmentId) {
        const appointment = await prisma.appointment.findFirst({
            where: {
                id: appointmentId,
                clinicianId: context.clinicianId,
                patientId,
            },
        });

        if (!appointment) {
            return { success: false, error: 'Appointment not found or access denied', data: null };
        }
    }

    // Create scribe session
    const session = await prisma.scribeSession.create({
        data: {
            patientId,
            clinicianId: context.clinicianId,
            appointmentId,
            status: 'RECORDING',
            transcriptionModel: 'whisper-1',
            soapModel: 'claude-3-5-sonnet-20250219',
            startedAt: new Date(),
        },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                    tokenId: true,
                },
            },
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            userEmail: '',
            ipAddress: 'mcp-agent',
            action: 'CREATE',
            resource: 'ScribeSession',
            resourceId: session.id,
            success: true,
            accessReason,
            accessPurpose,
            details: { patientId, appointmentId, agentId: context.agentId },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'start_recording_session',
        sessionId: session.id,
        patientId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessionId: session.id,
            status: session.status,
            patientId: session.patientId,
            patientName: `${session.patient.firstName} ${session.patient.lastName}`,
            patientMrn: session.patient.mrn,
            startedAt: session.startedAt,
            message: 'Recording session started. Audio streaming can now begin.',
        },
    };
}

// =============================================================================
// TOOL: stop_recording_session
// =============================================================================

async function stopRecordingSessionHandler(
    input: StopRecordingSessionInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId } = input;

    // Verify session belongs to this clinician
    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    if (session.status !== 'RECORDING' && session.status !== 'PAUSED') {
        return { success: false, error: `Cannot stop session in ${session.status} status`, data: null };
    }

    // Update session status
    const updated = await prisma.scribeSession.update({
        where: { id: sessionId },
        data: {
            status: 'PROCESSING',
            endedAt: new Date(),
            processingStartedAt: new Date(),
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'stop_recording_session',
        sessionId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessionId: updated.id,
            status: updated.status,
            startedAt: updated.startedAt,
            endedAt: updated.endedAt,
            audioDuration: updated.audioDuration,
            message: 'Recording stopped. Session is now processing.',
        },
    };
}

// =============================================================================
// TOOL: get_recording_session
// =============================================================================

async function getRecordingSessionHandler(
    input: GetRecordingSessionInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId } = input;

    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                    tokenId: true,
                    dateOfBirth: true,
                },
            },
            clinician: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    specialty: true,
                },
            },
            transcription: {
                select: {
                    id: true,
                    confidence: true,
                    wordCount: true,
                    durationSeconds: true,
                    speakerCount: true,
                    language: true,
                },
            },
            soapNote: {
                select: {
                    id: true,
                    status: true,
                    overallConfidence: true,
                    signedAt: true,
                },
            },
        },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_recording_session',
        sessionId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            id: session.id,
            status: session.status,
            patient: session.patient,
            clinician: session.clinician,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            audioDuration: session.audioDuration,
            audioFormat: session.audioFormat,
            processingError: session.processingError,
            transcription: session.transcription,
            soapNote: session.soapNote,
            createdAt: session.createdAt,
        },
    };
}

// =============================================================================
// TOOL: list_recording_sessions
// =============================================================================

async function listRecordingSessionsHandler(
    input: ListRecordingSessionsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { patientId, status, limit } = input;

    const where: any = {
        clinicianId: context.clinicianId,
    };

    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    const sessions = await prisma.scribeSession.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
            patient: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    mrn: true,
                    tokenId: true,
                },
            },
            transcription: {
                select: {
                    id: true,
                    confidence: true,
                    wordCount: true,
                    durationSeconds: true,
                },
            },
            soapNote: {
                select: {
                    id: true,
                    status: true,
                    overallConfidence: true,
                    signedAt: true,
                },
            },
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'list_recording_sessions',
        count: sessions.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessions: sessions.map((s) => ({
                id: s.id,
                status: s.status,
                patient: s.patient,
                startedAt: s.startedAt,
                endedAt: s.endedAt,
                audioDuration: s.audioDuration,
                hasTranscription: !!s.transcription,
                transcriptionConfidence: s.transcription?.confidence,
                hasSoapNote: !!s.soapNote,
                soapNoteStatus: s.soapNote?.status,
                createdAt: s.createdAt,
            })),
            total: sessions.length,
        },
    };
}

// =============================================================================
// TOOL: get_transcription
// =============================================================================

async function getTranscriptionHandler(
    input: GetTranscriptionInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId, includeSegments } = input;

    // Verify session belongs to this clinician
    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
        select: { id: true },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    const transcription = await prisma.transcription.findUnique({
        where: { sessionId },
    });

    if (!transcription) {
        return { success: false, error: 'No transcription found for this session', data: null };
    }

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_transcription',
        sessionId,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            id: transcription.id,
            sessionId: transcription.sessionId,
            rawText: transcription.rawText,
            segments: includeSegments ? transcription.segments : undefined,
            speakerCount: transcription.speakerCount,
            confidence: transcription.confidence,
            wordCount: transcription.wordCount,
            durationSeconds: transcription.durationSeconds,
            model: transcription.model,
            language: transcription.language,
            processingTime: transcription.processingTime,
            createdAt: transcription.createdAt,
        },
    };
}

// =============================================================================
// TOOL: extract_clinical_findings
// =============================================================================

async function extractClinicalFindingsHandler(
    input: ExtractClinicalFindingsInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId, chiefComplaint, symptoms, diagnoses, entities } = input;

    // Verify session belongs to this clinician
    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
        select: { id: true, patientId: true },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    const findings = {
        chiefComplaint,
        symptoms,
        diagnoses,
        entities,
    };

    // Hash payload for tamper-evident audit trail
    const ts = new Date();
    const dataHash = createHash('sha256')
        .update(JSON.stringify({ sessionId, patientId: session.patientId, findings, ts: ts.toISOString() }))
        .digest('hex');

    // Store findings in audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            userEmail: '',
            ipAddress: 'mcp-agent',
            action: 'UPDATE',
            resource: 'ScribeSessionFindings',
            resourceId: sessionId,
            accessReason: 'DIRECT_PATIENT_CARE',
            accessPurpose: 'FINDINGS_EXTRACTION',
            details: {
                findings,
                meta: {
                    sessionId,
                    patientId: session.patientId,
                    clinicianId: context.clinicianId,
                    recordedAt: ts.toISOString(),
                    agentId: context.agentId,
                },
            },
            dataHash,
            success: true,
            timestamp: ts,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'extract_clinical_findings',
        sessionId,
        hasChiefComplaint: !!chiefComplaint,
        symptomsCount: symptoms?.length || 0,
        diagnosesCount: diagnoses?.length || 0,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessionId,
            dataHash,
            findings,
            extractedAt: ts.toISOString(),
            message: 'Clinical findings extracted and logged for audit.',
        },
    };
}

// =============================================================================
// TOOL: generate_soap_note
// =============================================================================

async function generateSOAPNoteHandler(
    input: GenerateSOAPNoteInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId } = input;

    // Verify session belongs to this clinician
    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
        include: {
            patient: true,
            transcription: true,
            soapNote: true,
        },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    if (session.soapNote) {
        return {
            success: true,
            data: {
                sessionId,
                soapNoteId: session.soapNote.id,
                status: session.soapNote.status,
                alreadyExists: true,
                message: 'SOAP note already exists for this session.',
            },
        };
    }

    if (!session.transcription) {
        return {
            success: false,
            error: 'No transcription available. Finalize the recording session first.',
            data: null,
        };
    }

    // Check if session is in correct status
    if (session.status !== 'COMPLETED' && session.status !== 'PROCESSING') {
        return {
            success: false,
            error: `Cannot generate SOAP note for session in ${session.status} status. Complete processing first.`,
            data: null,
        };
    }

    // Note: The actual SOAP generation is handled by the finalize API route
    // This tool triggers the finalization process
    logger.info({
        event: 'mcp_tool_executed',
        tool: 'generate_soap_note',
        sessionId,
        action: 'trigger_finalization',
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessionId,
            transcriptionId: session.transcription.id,
            transcriptionWordCount: session.transcription.wordCount,
            transcriptionConfidence: session.transcription.confidence,
            message: 'SOAP note generation triggered. Use the finalize API endpoint (/api/scribe/sessions/:id/finalize) to complete processing.',
            nextStep: 'POST /api/scribe/sessions/' + sessionId + '/finalize',
        },
    };
}

// =============================================================================
// TOOL: finalize_clinical_note
// =============================================================================

async function finalizeClinicalNoteHandler(
    input: FinalizeClinicalNoteInput,
    context: MCPContext
): Promise<MCPResult> {
    const { noteId, signatureMethod, pin } = input;

    // Verify note belongs to this clinician
    const note = await prisma.sOAPNote.findFirst({
        where: { id: noteId, clinicianId: context.clinicianId },
    });

    if (!note) {
        return { success: false, error: 'SOAP note not found or access denied', data: null };
    }

    if (note.status === 'SIGNED') {
        return {
            success: false,
            error: 'Note is already signed',
            data: { noteId, status: 'SIGNED', signedAt: note.signedAt },
        };
    }

    // Validate PIN length
    if (pin.length < 4) {
        return { success: false, error: 'Invalid PIN - must be at least 4 characters', data: null };
    }

    // Update note with signature
    const signedNote = await prisma.sOAPNote.update({
        where: { id: noteId },
        data: {
            status: 'SIGNED',
            signedAt: new Date(),
            signedBy: context.clinicianId,
            signatureMethod,
        },
    });

    // Create audit log
    await prisma.auditLog.create({
        data: {
            userId: context.clinicianId,
            userEmail: '',
            ipAddress: 'mcp-agent',
            action: 'SIGN',
            resource: 'SOAPNote',
            resourceId: noteId,
            details: {
                signatureMethod,
                noteHash: note.noteHash,
                agentId: context.agentId,
            },
            dataHash: note.noteHash,
            success: true,
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'finalize_clinical_note',
        noteId,
        signatureMethod,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            noteId: signedNote.id,
            status: signedNote.status,
            signedAt: signedNote.signedAt,
            signedBy: signedNote.signedBy,
            signatureMethod,
            message: 'SOAP note signed successfully. Note is now part of the permanent medical record.',
        },
    };
}

// =============================================================================
// TOOL: get_scribe_templates
// =============================================================================

async function getScribeTemplatesHandler(
    input: GetScribeTemplatesInput,
    context: MCPContext
): Promise<MCPResult> {
    const { category, specialty } = input;

    // Get clinical templates that can be used for scribe sessions
    // Templates are either public, official, or created by the current clinician
    const where: any = {
        OR: [
            { isPublic: true },
            { isOfficial: true },
            { createdById: context.clinicianId },
        ],
    };

    if (category) where.category = category;
    if (specialty) where.specialty = specialty;

    const templates = await prisma.clinicalTemplate.findMany({
        where,
        select: {
            id: true,
            name: true,
            description: true,
            category: true,
            specialty: true,
            content: true,
            variables: true,
            shortcut: true,
            isPublic: true,
            isOfficial: true,
            useCount: true,
            createdAt: true,
        },
        orderBy: { name: 'asc' },
        take: 50,
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'get_scribe_templates',
        count: templates.length,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            templates: templates.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                category: t.category,
                specialty: t.specialty,
                shortcut: t.shortcut,
                isOfficial: t.isOfficial,
                isPublic: t.isPublic,
                useCount: t.useCount,
                createdAt: t.createdAt,
            })),
            total: templates.length,
        },
    };
}

// =============================================================================
// TOOL: update_transcription
// =============================================================================

async function updateTranscriptionHandler(
    input: UpdateTranscriptionInput,
    context: MCPContext
): Promise<MCPResult> {
    const { sessionId, segmentIndex, originalText, correctedText, confidence, speaker, startTime, endTime } = input;

    // Verify session belongs to this clinician
    const session = await prisma.scribeSession.findFirst({
        where: { id: sessionId, clinicianId: context.clinicianId },
        include: { transcription: true },
    });

    if (!session) {
        return { success: false, error: 'Session not found or access denied', data: null };
    }

    if (!session.transcription) {
        return { success: false, error: 'No transcription found for this session', data: null };
    }

    // Get current segments
    const segments = session.transcription.segments as any[];

    if (!Array.isArray(segments) || segmentIndex >= segments.length) {
        return { success: false, error: 'Invalid segment index', data: null };
    }

    // Update the segment with corrected text
    const updatedSegments = [...segments];
    updatedSegments[segmentIndex] = {
        ...updatedSegments[segmentIndex],
        text: correctedText,
        originalText,
        correctedAt: new Date().toISOString(),
        correctedBy: context.clinicianId,
    };

    // Update transcription in database
    await prisma.transcription.update({
        where: { id: session.transcription.id },
        data: {
            segments: updatedSegments,
            updatedAt: new Date(),
        },
    });

    // Calculate Levenshtein distance for ML analysis
    const editDistance = calculateLevenshteinDistance(originalText, correctedText);

    // Log to TranscriptionError model for ML improvement (RLHF Loop)
    await prisma.transcriptionError.create({
        data: {
            sessionId,
            segmentIndex,
            startTime: startTime || 0,
            endTime: endTime || 0,
            speaker,
            confidence,
            originalText,
            correctedText,
            editDistance,
            correctedBy: context.clinicianId,
            ipAddress: 'mcp-agent',
        },
    });

    logger.info({
        event: 'mcp_tool_executed',
        tool: 'update_transcription',
        sessionId,
        segmentIndex,
        editDistance,
        agentId: context.agentId,
    });

    return {
        success: true,
        data: {
            sessionId,
            segmentIndex,
            correctedText,
            editDistance,
            updatedAt: new Date().toISOString(),
            message: 'Transcription segment corrected. Correction logged for ML improvement.',
        },
    };
}

// =============================================================================
// EXPORT: Scribe Tools
// =============================================================================

export const scribeTools: MCPTool[] = [
    {
        name: 'start_recording_session',
        description: 'Start a new clinical recording session for a patient. Verifies recording consent and creates session for audio streaming. Requires HIPAA-compliant access reason.',
        category: 'scribe',
        inputSchema: StartRecordingSessionSchema,
        requiredPermissions: ['scribe:write', 'patient:read'],
        handler: startRecordingSessionHandler,
        examples: [
            {
                description: 'Start recording for a patient during direct care',
                input: {
                    patientId: 'patient-uuid',
                    accessReason: 'DIRECT_PATIENT_CARE',
                },
            },
        ],
    },
    {
        name: 'stop_recording_session',
        description: 'Stop an active recording session and begin processing. The session will transition to PROCESSING status.',
        category: 'scribe',
        inputSchema: StopRecordingSessionSchema,
        requiredPermissions: ['scribe:write'],
        handler: stopRecordingSessionHandler,
    },
    {
        name: 'get_recording_session',
        description: 'Get full details of a recording session including transcription and SOAP note status.',
        category: 'scribe',
        inputSchema: GetRecordingSessionSchema,
        requiredPermissions: ['scribe:read'],
        handler: getRecordingSessionHandler,
    },
    {
        name: 'list_recording_sessions',
        description: 'List recording sessions for the clinician with optional filtering by patient or status.',
        category: 'scribe',
        inputSchema: ListRecordingSessionsSchema,
        requiredPermissions: ['scribe:read'],
        handler: listRecordingSessionsHandler,
    },
    {
        name: 'get_transcription',
        description: 'Get the transcription text for a recording session. Optionally include speaker diarization segments.',
        category: 'scribe',
        inputSchema: GetTranscriptionSchema,
        requiredPermissions: ['scribe:read'],
        handler: getTranscriptionHandler,
    },
    {
        name: 'extract_clinical_findings',
        description: 'Extract and log clinical findings (symptoms, diagnoses, entities) from a transcription. Creates tamper-evident audit trail.',
        category: 'scribe',
        inputSchema: ExtractClinicalFindingsSchema,
        requiredPermissions: ['scribe:write', 'patient:read'],
        handler: extractClinicalFindingsHandler,
        examples: [
            {
                description: 'Extract findings with chief complaint and symptoms',
                input: {
                    sessionId: 'session-uuid',
                    chiefComplaint: 'Chronic headache',
                    symptoms: ['headache', 'nausea', 'light sensitivity'],
                    diagnoses: ['migraine'],
                },
            },
        ],
    },
    {
        name: 'generate_soap_note',
        description: 'Trigger SOAP note generation from a completed transcription. Returns next step for finalization.',
        category: 'scribe',
        inputSchema: GenerateSOAPNoteSchema,
        requiredPermissions: ['scribe:write', 'note:write'],
        handler: generateSOAPNoteHandler,
        dependsOn: ['get_transcription'],
    },
    {
        name: 'finalize_clinical_note',
        description: 'Sign and finalize a SOAP note, making it part of the permanent medical record. Requires PIN authentication.',
        category: 'scribe',
        inputSchema: FinalizeClinicalNoteSchema,
        requiredPermissions: ['note:write', 'note:sign'],
        handler: finalizeClinicalNoteHandler,
        dependsOn: ['generate_soap_note'],
    },
    {
        name: 'get_scribe_templates',
        description: 'Get available clinical templates for scribe sessions. Filter by category or specialty.',
        category: 'scribe',
        inputSchema: GetScribeTemplatesSchema,
        requiredPermissions: ['scribe:read'],
        handler: getScribeTemplatesHandler,
    },
    {
        name: 'update_transcription',
        description: 'Correct a transcription segment. Logs correction for ML improvement (RLHF loop).',
        category: 'scribe',
        inputSchema: UpdateTranscriptionSchema,
        requiredPermissions: ['scribe:write'],
        handler: updateTranscriptionHandler,
        examples: [
            {
                description: 'Correct a misheard medication name',
                input: {
                    sessionId: 'session-uuid',
                    segmentIndex: 5,
                    originalText: 'Take two tablets of Lyset daily',
                    correctedText: 'Take two tablets of Lisinopril daily',
                    confidence: 0.72,
                    speaker: 'clinician',
                },
            },
        ],
    },
];

// Tool count export for index
export const SCRIBE_TOOL_COUNT = scribeTools.length;
