/**
 * SOAP Note API
 *
 * GET   /api/scribe/notes/:id - Get SOAP note details
 * PATCH /api/scribe/notes/:id - Update SOAP note (inline editing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { UpdateSOAPNoteSchema } from '@/lib/validation/schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scribe/notes/:id
 * Get SOAP note with full details
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const noteId = context.params.id;

      // Fetch note with access control
      const note = await prisma.sOAPNote.findFirst({
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
        return NextResponse.json(
          { error: 'SOAP note not found or access denied' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: note,
      });
    } catch (error: any) {
      console.error('Error fetching SOAP note:', error);
      return NextResponse.json(
        { error: 'Failed to fetch SOAP note', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/scribe/notes/:id
 * Update SOAP note (inline editing with edit tracking)
 */
export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const noteId = context.params.id;
      const body = await request.json();

      // Validate with medical-grade Zod schema
      let validatedData;
      try {
        validatedData = UpdateSOAPNoteSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              message: 'Please check your input and try again',
              details: error.errors.map((err) => ({
                field: err.path.join('.'),
                message: err.message,
              })),
            },
            { status: 400 }
          );
        }
        throw error;
      }

      // Verify note belongs to this clinician
      const existingNote = await prisma.sOAPNote.findFirst({
        where: {
          id: noteId,
          clinicianId: context.user.id,
        },
      });

      if (!existingNote) {
        return NextResponse.json(
          { error: 'SOAP note not found or access denied' },
          { status: 404 }
        );
      }

      // Can't edit signed notes
      if (existingNote.status === 'SIGNED') {
        return NextResponse.json(
          { error: 'Cannot edit signed notes. Create an addendum instead.' },
          { status: 400 }
        );
      }

      // Build edit history
      const editHistory = existingNote.editHistory as any[] || [];
      const newEdits: any[] = [];

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
        if ((validatedData as any)[field] !== undefined && (validatedData as any)[field] !== (existingNote as any)[field]) {
          newEdits.push({
            field,
            oldValue: (existingNote as any)[field],
            newValue: (validatedData as any)[field],
            editedAt: new Date().toISOString(),
            editedBy: context.user.id,
          });
        }
      }

      // Update note with edit tracking (using validated data - type-safe)
      const updateData: any = {};

      if (validatedData.subjective !== undefined) updateData.subjective = validatedData.subjective;
      if (validatedData.objective !== undefined) updateData.objective = validatedData.objective;
      if (validatedData.assessment !== undefined) updateData.assessment = validatedData.assessment;
      if (validatedData.plan !== undefined) updateData.plan = validatedData.plan;
      if (validatedData.chiefComplaint !== undefined) updateData.chiefComplaint = validatedData.chiefComplaint;
      if (validatedData.diagnoses !== undefined) updateData.diagnoses = validatedData.diagnoses;
      if (validatedData.procedures !== undefined) updateData.procedures = validatedData.procedures;
      if (validatedData.medications !== undefined) updateData.medications = validatedData.medications;
      if (validatedData.vitalSigns !== undefined) updateData.vitalSigns = validatedData.vitalSigns;

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
        updateData.noteHash = createHash('sha256').update(noteContent).digest('hex');
      }

      const updatedNote = await prisma.sOAPNote.update({
        where: { id: noteId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        data: updatedNote,
        message: newEdits.length > 0 ? `${newEdits.length} field(s) updated` : 'No changes detected',
      });
    } catch (error: any) {
      console.error('Error updating SOAP note:', error);
      return NextResponse.json(
        { error: 'Failed to update SOAP note', message: error.message },
        { status: 500 }
      );
    }
  }
);
