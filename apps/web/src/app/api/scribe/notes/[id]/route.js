"use strict";
/**
 * SOAP Note API
 *
 * GET   /api/scribe/notes/:id - Get SOAP note details
 * PATCH /api/scribe/notes/:id - Update SOAP note (inline editing)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = exports.GET = exports.dynamic = void 0;
const server_1 = require("next/server");
const middleware_1 = require("@/lib/api/middleware");
const prisma_1 = require("@/lib/prisma");
const crypto_1 = require("crypto");
const schemas_1 = require("@/lib/validation/schemas");
const zod_1 = require("zod");
exports.dynamic = 'force-dynamic';
/**
 * GET /api/scribe/notes/:id
 * Get SOAP note with full details
 */
exports.GET = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const noteId = context.params.id;
        // Fetch note with access control
        const note = await prisma_1.prisma.sOAPNote.findFirst({
            where: {
                id: noteId,
                clinicianId: context.user.id, // SECURITY: Only clinician can view their notes
            },
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
                session: {
                    select: {
                        id: true,
                        audioDuration: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!note) {
            return server_1.NextResponse.json({ error: 'SOAP note not found or access denied' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: note,
        });
    }
    catch (error) {
        console.error('Error fetching SOAP note:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch SOAP note', message: error.message }, { status: 500 });
    }
});
/**
 * PATCH /api/scribe/notes/:id
 * Update SOAP note (inline editing with edit tracking)
 */
exports.PATCH = (0, middleware_1.createProtectedRoute)(async (request, context) => {
    try {
        const noteId = context.params.id;
        const body = await request.json();
        // Validate with medical-grade Zod schema
        let validatedData;
        try {
            validatedData = schemas_1.UpdateSOAPNoteSchema.parse(body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return server_1.NextResponse.json({
                    error: 'Validation failed',
                    message: 'Please check your input and try again',
                    details: error.errors.map((err) => ({
                        field: err.path.join('.'),
                        message: err.message,
                    })),
                }, { status: 400 });
            }
            throw error;
        }
        // Verify note belongs to this clinician
        const existingNote = await prisma_1.prisma.sOAPNote.findFirst({
            where: {
                id: noteId,
                clinicianId: context.user.id,
            },
        });
        if (!existingNote) {
            return server_1.NextResponse.json({ error: 'SOAP note not found or access denied' }, { status: 404 });
        }
        // Can't edit signed notes
        if (existingNote.status === 'SIGNED') {
            return server_1.NextResponse.json({ error: 'Cannot edit signed notes. Create an addendum instead.' }, { status: 400 });
        }
        // Build edit history
        const editHistory = existingNote.editHistory || [];
        const newEdits = [];
        // Track changes for each field
        const editableFields = [
            'subjective',
            'objective',
            'assessment',
            'plan',
            'chiefComplaint',
            'diagnoses',
            'procedures',
            'medications',
            'vitalSigns',
        ];
        for (const field of editableFields) {
            if (validatedData[field] !== undefined && validatedData[field] !== existingNote[field]) {
                newEdits.push({
                    field,
                    oldValue: existingNote[field],
                    newValue: validatedData[field],
                    editedAt: new Date().toISOString(),
                    editedBy: context.user.id,
                });
            }
        }
        // Update note with edit tracking (using validated data - type-safe)
        const updateData = {};
        if (validatedData.subjective !== undefined)
            updateData.subjective = validatedData.subjective;
        if (validatedData.objective !== undefined)
            updateData.objective = validatedData.objective;
        if (validatedData.assessment !== undefined)
            updateData.assessment = validatedData.assessment;
        if (validatedData.plan !== undefined)
            updateData.plan = validatedData.plan;
        if (validatedData.chiefComplaint !== undefined)
            updateData.chiefComplaint = validatedData.chiefComplaint;
        if (validatedData.diagnoses !== undefined)
            updateData.diagnoses = validatedData.diagnoses;
        if (validatedData.procedures !== undefined)
            updateData.procedures = validatedData.procedures;
        if (validatedData.medications !== undefined)
            updateData.medications = validatedData.medications;
        if (validatedData.vitalSigns !== undefined)
            updateData.vitalSigns = validatedData.vitalSigns;
        if (newEdits.length > 0) {
            updateData.wasEdited = true;
            updateData.editCount = existingNote.editCount + newEdits.length;
            updateData.editHistory = [...editHistory, ...newEdits];
        }
        // Regenerate hash if content changed (using validated data)
        if (validatedData.subjective || validatedData.objective || validatedData.assessment || validatedData.plan) {
            const noteContent = JSON.stringify({
                patientId: existingNote.patientId,
                clinicianId: existingNote.clinicianId,
                subjective: validatedData.subjective || existingNote.subjective,
                objective: validatedData.objective || existingNote.objective,
                assessment: validatedData.assessment || existingNote.assessment,
                plan: validatedData.plan || existingNote.plan,
                updatedAt: new Date().toISOString(),
            });
            updateData.noteHash = (0, crypto_1.createHash)('sha256').update(noteContent).digest('hex');
        }
        const updatedNote = await prisma_1.prisma.sOAPNote.update({
            where: { id: noteId },
            data: updateData,
        });
        return server_1.NextResponse.json({
            success: true,
            data: updatedNote,
            message: newEdits.length > 0 ? `${newEdits.length} field(s) updated` : 'No changes detected',
        });
    }
    catch (error) {
        console.error('Error updating SOAP note:', error);
        return server_1.NextResponse.json({ error: 'Failed to update SOAP note', message: error.message }, { status: 500 });
    }
});
//# sourceMappingURL=route.js.map