/**
 * Available Slots API for Rescheduling
 * GET /api/appointments/confirm/[token]/available-slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAppointmentByToken, getAvailableSlots } from '@/lib/appointments/confirmation';
import { addDays } from 'date-fns';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token is required',
        },
        { status: 400 }
      );
    }

    const appointment = await getAppointmentByToken(token);

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cita no encontrada',
        },
        { status: 404 }
      );
    }

    // Get available slots for next 14 days
    const startDate = new Date();
    const endDate = addDays(startDate, 14);

    const slots = await getAvailableSlots(
      appointment.clinicianId,
      startDate,
      endDate
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          slots: slots.map((slot) => ({
            time: slot.toISOString(),
            available: true,
          })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({
      event: 'available_slots_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar horarios disponibles',
      },
      { status: 500 }
    );
  }
}
