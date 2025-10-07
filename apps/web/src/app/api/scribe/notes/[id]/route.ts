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
        if (body[field] !== undefined && body[field] !== (existingNote as any)[field]) {
          newEdits.push({
            field,
            oldValue: (existingNote as any)[field],
            newValue: body[field],
            editedAt: new Date().toISOString(),
            editedBy: context.user.id,
          });
        }
      }

      // Update note with edit tracking
      const updateData: any = {};

      if (body.subjective !== undefined) updateData.subjective = body.subjective;
      if (body.objective !== undefined) updateData.objective = body.objective;
      if (body.assessment !== undefined) updateData.assessment = body.assessment;
      if (body.plan !== undefined) updateData.plan = body.plan;
      if (body.chiefComplaint !== undefined) updateData.chiefComplaint = body.chiefComplaint;
      if (body.diagnoses !== undefined) updateData.diagnoses = body.diagnoses;
      if (body.procedures !== undefined) updateData.procedures = body.procedures;
      if (body.medications !== undefined) updateData.medications = body.medications;
      if (body.vitalSigns !== undefined) updateData.vitalSigns = body.vitalSigns;

      if (newEdits.length > 0) {
        updateData.wasEdited = true;
        updateData.editCount = existingNote.editCount + newEdits.length;
        updateData.editHistory = [...editHistory, ...newEdits];
      }

      // Regenerate hash if content changed
      if (body.subjective || body.objective || body.assessment || body.plan) {
        const noteContent = JSON.stringify({
          patientId: existingNote.patientId,
          clinicianId: existingNote.clinicianId,
          subjective: body.subjective || existingNote.subjective,
          objective: body.objective || existingNote.objective,
          assessment: body.assessment || existingNote.assessment,
          plan: body.plan || existingNote.plan,
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
