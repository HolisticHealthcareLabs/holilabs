/**
 * Clinical Notes API
 *
 * POST /api/clinical-notes - Create clinical note
 * GET /api/clinical-notes?patientId=xxx - Get notes for patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import crypto from 'crypto';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { logger } from '@/lib/logger';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


/**
 * POST /api/clinical-notes
 * Create new clinical note with blockchain hash
 * SECURITY: Enforces tenant isolation - clinicians can only create notes for their own patients
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();

      // Validate required fields
      if (!body.patientId || !body.noteType) {
        return NextResponse.json(
          { error: 'Missing required fields: patientId, noteType' },
          { status: 400 }
        );
      }

      // ===================================================================
      // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
      // ===================================================================
      // Verify the patient belongs to this clinician
      const patient = await prisma.patient.findUnique({
        where: { id: body.patientId },
        select: { assignedClinicianId: true },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Only ADMIN or assigned clinician can create notes for this patient
      if (
        patient.assignedClinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot create notes for this patient' },
          { status: 403 }
        );
      }

      // Use authenticated user ID as clinician
      const clinicianId = context.user.id;

      // Generate data hash for blockchain verification
      const noteData = {
        patientId: body.patientId,
        clinicianId,
        noteType: body.noteType,
        content: body.content || {},
        timestamp: new Date().toISOString(),
      };

      const dataHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(noteData))
        .digest('hex');

      // Create clinical note
      const note = await prisma.clinicalNote.create({
        data: {
          patientId: body.patientId,
          authorId: clinicianId,
          type: body.noteType,
          chiefComplaint: body.chiefComplaint || '',
          subjective: body.subjective || '',
          objective: body.objective || '',
          assessment: body.assessment || '',
          plan: body.plan || '',
          diagnosis: body.diagnoses || [],
          noteHash: dataHash,
        },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tokenId: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: clinicianId,
          userEmail: context.user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'ClinicalNote',
          resourceId: note.id,
          details: { noteType: body.noteType, dataHash },
          success: true,
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.CLINICAL_NOTE_CREATED,
        clinicianId,
        {
          noteType: body.noteType,
          hasChiefComplaint: !!body.chiefComplaint,
          hasSubjective: !!body.subjective,
          hasObjective: !!body.objective,
          hasAssessment: !!body.assessment,
          hasPlan: !!body.plan,
          diagnosesCount: body.diagnoses?.length || 0,
          success: true
        }
      );

      return NextResponse.json(
        {
          success: true,
          data: note,
          message: 'Clinical note created successfully',
        },
        { status: 201 }
      );
    } catch (error: any) {
      logger.error({
        event: 'clinical_note_create_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Failed to create clinical note', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'CREATE', resource: 'ClinicalNote' },
  }
);

/**
 * GET /api/clinical-notes?patientId=xxx
 * Get clinical notes for a patient
 * SECURITY: Enforces tenant isolation - clinicians can only view notes for their own patients
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const patientId = searchParams.get('patientId');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!patientId) {
        return NextResponse.json(
          { error: 'patientId query parameter is required' },
          { status: 400 }
        );
      }

      // ===================================================================
      // SECURITY: TENANT ISOLATION - CRITICAL FOR HIPAA COMPLIANCE
      // ===================================================================
      // Verify the patient belongs to this clinician
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { assignedClinicianId: true },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Only ADMIN or assigned clinician can view notes for this patient
      if (
        patient.assignedClinicianId !== context.user.id &&
        context.user.role !== 'ADMIN'
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot access notes for this patient' },
          { status: 403 }
        );
      }

      const notes = await prisma.clinicalNote.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      logger.error({
        event: 'clinical_notes_fetch_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return NextResponse.json(
        { error: 'Failed to fetch clinical notes', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'ClinicalNote' },
    skipCsrf: true, // GET requests don't need CSRF protection
  }
);
