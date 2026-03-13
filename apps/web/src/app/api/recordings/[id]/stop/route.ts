/**
 * Stop Recording Session API
 *
 * POST /api/recordings/[id]/stop
 * Stop an active recording session
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    try {
      const recordingId = context.params?.id;

    // Get recording session
    const recording = await prisma.scribeSession.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          include: {
            clinician: true,
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
    if (recording.appointment?.clinician?.id !== context.user!.id) {
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
    const startedAt = new Date(recording.startedAt || new Date());
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Update recording session
    const updatedRecording = await prisma.scribeSession.update({
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
        userId: context.user!.id,
        userEmail: context.user!.email || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'UPDATE',
        resource: 'RecordingSession',
        resourceId: recordingId,
        success: true,
        details: {
          status: 'stopped',
          durationSeconds,
        },
      },
    });

    logger.info({
      event: 'recording_stopped',
      userId: context.user!.id,
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
},
  { roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'] }
);
