/**
 * Recording Detail API
 *
 * GET /api/recordings/[id]
 * Fetch recording session details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
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

    // Fetch recording with all related data
    // TODO: recordingSession model doesn't exist - using scribeSession instead
    const recording = await prisma.scribeSession.findUnique({
      where: { id: recordingId },
      include: {
        appointment: {
          select: {
            id: true,
            title: true,
            startTime: true,
            clinicianId: true,
          },
        },
        patient: {
          select: {
            id: true,
            // TODO: patientId field doesn't exist - using mrn instead
            mrn: true,
            firstName: true,
            lastName: true,
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

    // Verify access (clinician who recorded it or patient)
    const isAuthorized =
      recording.appointment.clinicianId === (session.user as any).id ||
      recording.patientId === (session.user as any).id;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para ver esta grabación' },
        { status: 403 }
      );
    }

    logger.info({
      event: 'recording_viewed',
      userId: (session.user as any).id,
      recordingId,
    });

    return NextResponse.json(
      {
        success: true,
        data: recording,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'recording_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar grabación',
      },
      { status: 500 }
    );
  }
}
