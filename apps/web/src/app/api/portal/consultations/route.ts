/**
 * Patient Consultations API
 *
 * GET /api/portal/consultations
 * Fetch all consultation recordings for authenticated patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Fetch all recordings for this patient
    const recordings = await prisma.recordingSession.findMany({
      where: {
        patientId: session.patientId,
        status: {
          in: ['COMPLETED', 'PROCESSING', 'TRANSCRIBING'],
        },
      },
      include: {
        appointment: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    logger.info({
      event: 'patient_consultations_fetched',
      patientId: session.patientId,
      patientUserId: session.userId,
      count: recordings.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: recordings,
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_consultations_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar consultas.',
      },
      { status: 500 }
    );
  }
}
