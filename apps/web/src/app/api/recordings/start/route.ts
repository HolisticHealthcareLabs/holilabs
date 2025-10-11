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
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const StartRecordingSchema = z.object({
  appointmentId: z.string().uuid(),
  patientId: z.string().uuid(),
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

    const { appointmentId, patientId } = validation.data;

    // Verify appointment exists and belongs to this clinician
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        clinician: {
          include: { user: true },
        },
        patient: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Cita no encontrada' },
        { status: 404 }
      );
    }

    if (appointment.clinician.user.id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para grabar esta cita' },
        { status: 403 }
      );
    }

    // Check if there's already an active recording for this appointment
    const existingRecording = await prisma.recordingSession.findFirst({
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
    const recording = await prisma.recordingSession.create({
      data: {
        appointmentId,
        patientId,
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
            patientId: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userEmail: session.user.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'RecordingSession',
        resourceId: recording.id,
        success: true,
        metadata: {
          appointmentId,
          patientId,
        },
      },
    });

    logger.info({
      event: 'recording_started',
      userId: session.user.id,
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
