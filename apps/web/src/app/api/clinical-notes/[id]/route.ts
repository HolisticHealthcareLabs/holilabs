/**
 * Single Clinical Note API
 *
 * GET /api/clinical-notes/[id] - Get single note
 * PATCH /api/clinical-notes/[id] - Update note (with automatic versioning)
 * DELETE /api/clinical-notes/[id] - Delete note
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createNoteVersion, calculateNoteHash } from '@/lib/clinical-notes/version-control';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// ============================================================================
// GET /api/clinical-notes/[id]
// ============================================================================

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;

      const note = await prisma.clinicalNote.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
              assignedClinicianId: true,
            },
          },
          versions: {
            take: 5, // Include last 5 versions for quick access
            orderBy: { versionNumber: 'desc' },
            include: {
              changedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'Clinical note not found' },
          { status: 404 }
        );
      }

      // SECURITY: Verify access
      if (
        note.patient.assignedClinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot access this note' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: note,
      });
    } catch (error: any) {
      logger.error({
        event: 'clinical_note_fetch_error',
        noteId: context.params?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Failed to fetch clinical note', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 100 },
    audit: { action: 'READ', resource: 'ClinicalNote' },
    
  }
);

// ============================================================================
// PATCH /api/clinical-notes/[id]
// ============================================================================

const UpdateNoteSchema = z.object({
  type: z.enum(['PROGRESS', 'CONSULTATION', 'ADMISSION', 'DISCHARGE', 'PROCEDURE']).optional(),
  chiefComplaint: z.string().optional(),
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  diagnosis: z.array(z.string()).optional(),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;
      const body = await request.json();

      // Validate input
      const validated = UpdateNoteSchema.parse(body);

      // Get current note state (for versioning)
      const currentNote = await prisma.clinicalNote.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              assignedClinicianId: true,
            },
          },
        },
      });

      if (!currentNote) {
        return NextResponse.json(
          { error: 'Clinical note not found' },
          { status: 404 }
        );
      }

      // SECURITY: Verify access
      // Only assigned clinician, note author, or ADMIN can edit
      if (
        currentNote.patient.assignedClinicianId !== context.user.id &&
        currentNote.authorId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot edit this note' },
          { status: 403 }
        );
      }

      // SECURITY: Prevent editing signed notes (unless admin)
      if (currentNote.signedAt && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            error: 'Cannot edit signed note',
            details: 'Signed notes can only be edited by administrators',
          },
          { status: 403 }
        );
      }

      // Create version snapshot BEFORE update
      const oldSnapshot = {
        type: currentNote.type,
        subjective: currentNote.subjective,
        objective: currentNote.objective,
        assessment: currentNote.assessment,
        plan: currentNote.plan,
        chiefComplaint: currentNote.chiefComplaint,
        diagnosis: currentNote.diagnosis,
      };

      // Prepare update data
      const updateData: any = {};
      if (validated.type !== undefined) updateData.type = validated.type;
      if (validated.chiefComplaint !== undefined) updateData.chiefComplaint = validated.chiefComplaint;
      if (validated.subjective !== undefined) updateData.subjective = validated.subjective;
      if (validated.objective !== undefined) updateData.objective = validated.objective;
      if (validated.assessment !== undefined) updateData.assessment = validated.assessment;
      if (validated.plan !== undefined) updateData.plan = validated.plan;
      if (validated.diagnosis !== undefined) updateData.diagnosis = validated.diagnosis;

      // Calculate new hash
      const newSnapshot = {
        type: validated.type ?? currentNote.type,
        subjective: validated.subjective ?? currentNote.subjective,
        objective: validated.objective ?? currentNote.objective,
        assessment: validated.assessment ?? currentNote.assessment,
        plan: validated.plan ?? currentNote.plan,
        chiefComplaint: validated.chiefComplaint ?? currentNote.chiefComplaint,
        diagnosis: validated.diagnosis ?? currentNote.diagnosis,
      };

      const newHash = calculateNoteHash(newSnapshot);
      updateData.noteHash = newHash;

      // Get user context for versioning
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Create version snapshot (only if content changed)
      await createNoteVersion({
        noteId: id,
        oldNote: oldSnapshot,
        newNote: newSnapshot,
        changedBy: context.user.id,
        ipAddress,
        userAgent,
      });

      // Update the note
      const updatedNote = await prisma.clinicalNote.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
          versions: {
            take: 5,
            orderBy: { versionNumber: 'desc' },
            include: {
              changedByUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.CLINICAL_NOTE_UPDATED,
        context.user.id,
        {
          noteType: updatedNote.type,
          fieldsUpdated: Object.keys(updateData).length,
          hasVersionHistory: updatedNote.versions.length > 0,
          success: true,
        }
      );

      return NextResponse.json({
        success: true,
        data: updatedNote,
        message: 'Clinical note updated successfully',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }

      logger.error({
        event: 'clinical_note_update_error',
        noteId: context.params?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Failed to update clinical note', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'ClinicalNote' },
  }
);

// ============================================================================
// DELETE /api/clinical-notes/[id]
// ============================================================================

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { id } = context.params;

      // Get current note (to verify access and check if signed)
      const note = await prisma.clinicalNote.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              assignedClinicianId: true,
            },
          },
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'Clinical note not found' },
          { status: 404 }
        );
      }

      // SECURITY: Verify access
      if (
        note.patient.assignedClinicianId !== context.user.id &&
        note.authorId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot delete this note' },
          { status: 403 }
        );
      }

      // SECURITY: Prevent deleting signed notes (unless admin)
      if (note.signedAt && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            error: 'Cannot delete signed note',
            details: 'Signed notes can only be deleted by administrators',
          },
          { status: 403 }
        );
      }

      // Delete note (cascade will delete versions)
      await prisma.clinicalNote.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Clinical note deleted successfully',
      });
    } catch (error: any) {
      logger.error({
        event: 'clinical_note_delete_error',
        noteId: context.params?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Failed to delete clinical note', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
    audit: { action: 'DELETE', resource: 'ClinicalNote' },
  }
);
