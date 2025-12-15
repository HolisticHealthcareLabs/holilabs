/**
 * Appointment Situations API Routes
 * POST /api/appointments/[id]/situations - Add situation to appointment
 * DELETE /api/appointments/[id]/situations - Remove situation from appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * POST /api/appointments/[id]/situations
 * Adds a situation tag to an appointment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appointmentId = params.id;
    const body = await request.json();
    const { situationId, notes } = body;

    if (!situationId) {
      return NextResponse.json(
        { success: false, error: 'situationId is required' },
        { status: 400 }
      );
    }

    // Verify appointment exists and user has access
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, clinician: true },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Check if situation already exists on appointment
    const existing = await prisma.appointmentSituation.findUnique({
      where: {
        appointmentId_situationId: {
          appointmentId,
          situationId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Situation already added to this appointment' },
        { status: 400 }
      );
    }

    // Add situation to appointment
    const appointmentSituation = await prisma.appointmentSituation.create({
      data: {
        appointmentId,
        situationId,
        addedBy: (session.user as any).id,
        notes,
      },
      include: {
        situation: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { appointmentSituation },
      message: 'Situation added successfully',
    });
  } catch (error: any) {
    logger.error({
      event: 'appointment_situation_add_failed',
      appointmentId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to add situation' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]/situations
 * Removes a situation tag from an appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting - 60 requests per minute for appointments
    const rateLimitResponse = await checkRateLimit(request, 'appointments');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appointmentId = params.id;
    const { searchParams } = new URL(request.url);
    const situationId = searchParams.get('situationId');

    if (!situationId) {
      return NextResponse.json(
        { success: false, error: 'situationId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Remove situation from appointment
    await prisma.appointmentSituation.delete({
      where: {
        appointmentId_situationId: {
          appointmentId,
          situationId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Situation removed successfully',
    });
  } catch (error: any) {
    logger.error({
      event: 'appointment_situation_remove_failed',
      appointmentId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to remove situation' },
      { status: 500 }
    );
  }
}
