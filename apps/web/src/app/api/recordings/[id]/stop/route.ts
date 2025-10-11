/**
 * Stop Recording Session API
 *
 * POST /api/recordings/[id]/stop
 * Stop an active recording session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const recordingId = params.id;

    // Get recording session
    const recording = await prisma.recordingSession.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          include: {
            clinician: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!recording) {
      return NextResponse.json(
        { success: false, error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (recording.appointment.clinician.user.id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para detener esta grabación' },
        { status: 403 }
      );
    }

    // Check if already stopped
    if (recording.status !== 'RECORDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta grabación ya fue detenida',
        },
        { status: 400 }
      );
    }

    // Calculate duration
    const startedAt = new Date(recording.startedAt);
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Update recording session
    const updatedRecording = await prisma.recordingSession.update({
      where: { id: recordingId },
      data: {
        status: 'PROCESSING',
        endedAt,
        audioDuration: durationSeconds,
      },
      include: {
        appointment: {
          select: {
            title: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
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
        action: 'UPDATE',
        resource: 'RecordingSession',
        resourceId: recordingId,
        success: true,
        metadata: {
          status: 'stopped',
          durationSeconds,
        },
      },
    });

    logger.info({
      event: 'recording_stopped',
      userId: session.user.id,
      recordingId,
      durationSeconds,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Grabación detenida',
        data: updatedRecording,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'recording_stop_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al detener grabación',
      },
      { status: 500 }
    );
  }
}
