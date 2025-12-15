/**
 * Start Recording Session API
 *
 * POST /api/recordings/start
 * Start a new audio recording session for a consultation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { verifyRecordingConsent } from '@/lib/consent/recording-consent';

const StartRecordingSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
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
  ]),
  accessPurpose: z.string().optional(), // Free-text explanation
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const validation = StartRecordingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { appointmentId, patientId, accessReason, accessPurpose } = validation.data;

    // Verify appointment exists and belongs to this clinician
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinician: true, // TODO: Fixed - clinician is already a User, no nested 'user' relation exists
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    if (appointment.clinician.id !== (session.user as any).id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para grabar esta cita' },
        { status: 403 }
      );
    }

    // Verify recording consent (two-party consent states)
    const consentCheck = await verifyRecordingConsent(patientId, appointment.patient.state || undefined);

    if (!consentCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recording consent required',
          reason: consentCheck.reason,
          requiresConsent: consentCheck.requiresConsent,
          patientState: appointment.patient.state,
        },
        { status: 403 }
      );
    }

    // Check if there's already an active recording for this appointment
    const existingRecording = await prisma.scribeSession.findFirst({
      where: {
        appointmentId,
        status: 'RECORDING',
      },
    });

    if (existingRecording) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe una grabación activa para esta cita',
        },
        { status: 400 }
      );
    }

    // Create new recording session
    const recording = await prisma.scribeSession.create({
      data: {
        appointmentId,
        patientId,
        clinicianId: appointment.clinicianId, // TODO: Added required clinicianId field
        status: 'RECORDING',
        startedAt: new Date(),
      },
      include: {
        appointment: {
          select: {
            title: true,
            startTime: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            // TODO: patientId field doesn't exist on Patient model, using id instead
            id: true,
          },
        },
      },
    });

    // Create audit log with access reason (HIPAA §164.502(b) Minimum Necessary)
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        userEmail: session.user.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'RecordingSession',
        resourceId: recording.id,
        success: true,
        accessReason, // REQUIRED: HIPAA compliance
        accessPurpose, // Optional: Additional context
        details: {
          appointmentId,
          patientId,
        },
      },
    });

    logger.info({
      event: 'recording_started',
      userId: (session.user as any).id,
      recordingId: recording.id,
      appointmentId,
      patientId,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Grabación iniciada',
        data: recording,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({
      event: 'recording_start_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al iniciar grabación',
      },
      { status: 500 }
    );
  }
}
