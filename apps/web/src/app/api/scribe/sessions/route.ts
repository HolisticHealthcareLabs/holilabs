/**
 * Scribe Sessions API
 *
 * POST /api/scribe/sessions - Create new scribe session
 * GET  /api/scribe/sessions - List scribe sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { trackEvent, ServerAnalyticsEvents } from '@/lib/analytics/server-analytics';
import { verifyRecordingConsent } from '@/lib/consent/recording-consent';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scribe/sessions
 * Create a new scribe session (start recording)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { patientId, appointmentId, accessReason, accessPurpose } = body;

      if (!patientId) {
        return NextResponse.json(
          { error: 'Patient ID is required' },
          { status: 400 }
        );
      }

      // HIPAA §164.502(b) - Access Reason Required
      const validAccessReasons = [
        'DIRECT_PATIENT_CARE',
        'CARE_COORDINATION',
        'EMERGENCY_ACCESS',
        'ADMINISTRATIVE',
        'QUALITY_IMPROVEMENT',
        'BILLING',
        'LEGAL_COMPLIANCE',
        'RESEARCH_IRB_APPROVED',
        'PUBLIC_HEALTH',
      ];

      if (!accessReason || !validAccessReasons.includes(accessReason)) {
        return NextResponse.json(
          {
            error: 'Access reason is required for HIPAA compliance',
            validReasons: validAccessReasons,
          },
          { status: 400 }
        );
      }

      // SECURITY: Verify clinician has access to this patient
      const patient = await prisma.patient.findFirst({
        where: {
          id: patientId,
          assignedClinicianId: context.user.id,
        },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found or access denied' },
          { status: 404 }
        );
      }

      // Verify recording consent (two-party consent states)
      const consentCheck = await verifyRecordingConsent(patientId, patient.state || undefined);

      if (!consentCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Recording consent required',
            reason: consentCheck.reason,
            requiresConsent: consentCheck.requiresConsent,
            patientState: patient.state,
          },
          { status: 403 }
        );
      }

      // Verify appointment if provided
      if (appointmentId) {
        const appointment = await prisma.appointment.findFirst({
          where: {
            id: appointmentId,
            clinicianId: context.user.id,
            patientId,
          },
        });

        if (!appointment) {
          return NextResponse.json(
            { error: 'Appointment not found or access denied' },
            { status: 404 }
          );
        }
      }

      // Create scribe session
      const session = await prisma.scribeSession.create({
        data: {
          patientId,
          clinicianId: context.user.id,
          appointmentId,
          status: 'RECORDING',
          transcriptionModel: 'whisper-1',
          soapModel: 'claude-3-5-sonnet-20250219',
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
        },
      });

      // Create audit log with access reason (HIPAA §164.502(b))
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || '',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          action: 'CREATE',
          resource: 'ScribeSession',
          resourceId: session.id,
          success: true,
          accessReason, // REQUIRED: HIPAA compliance
          accessPurpose, // Optional: Additional context
          details: {
            patientId,
            appointmentId,
          },
        },
      });

      // Track analytics event (NO PHI!)
      await trackEvent(
        ServerAnalyticsEvents.SCRIBE_SESSION_STARTED,
        context.user.id,
        {
          hasAppointment: !!appointmentId,
          transcriptionModel: 'whisper-1',
          soapModel: 'claude-3-5-sonnet',
          success: true
        }
      );

      return NextResponse.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Error creating scribe session:', error);
      return NextResponse.json(
        { error: 'Failed to create scribe session', message: error.message },
        { status: 500 }
      );
    }
  }
);

/**
 * GET /api/scribe/sessions
 * List scribe sessions with pagination
 */
export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const skip = (page - 1) * limit;

      // Filters
      const patientId = searchParams.get('patientId');
      const status = searchParams.get('status');

      // Build where clause with tenant isolation
      const where: any = {
        clinicianId: context.user.id, // CRITICAL: Only show this clinician's sessions
      };

      if (patientId) {
        where.patientId = patientId;
      }

      if (status) {
        where.status = status;
      }

      // Execute query
      const [sessions, total] = await Promise.all([
        prisma.scribeSession.findMany({
          where,
          skip,
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
        }),
        prisma.scribeSession.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        data: sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching scribe sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scribe sessions', message: error.message },
        { status: 500 }
      );
    }
  }
);
