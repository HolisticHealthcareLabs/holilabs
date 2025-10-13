/**
 * Appointment Confirmation Statistics API
 * GET /api/appointments/confirmation-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Get today's date range
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Get date range for next 7 days
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);

    // Get all upcoming appointments for this clinician
    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        clinicianId: session.userId,
        startTime: {
          gte: today,
          lte: next7Days,
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED'],
        },
      },
      select: {
        id: true,
        confirmationStatus: true,
        startTime: true,
      },
    });

    // Calculate stats
    const stats = {
      total: upcomingAppointments.length,
      confirmed: upcomingAppointments.filter(
        (apt) => apt.confirmationStatus === 'CONFIRMED'
      ).length,
      pending: upcomingAppointments.filter(
        (apt) => apt.confirmationStatus === 'PENDING' || apt.confirmationStatus === 'SENT'
      ).length,
      rescheduleRequested: upcomingAppointments.filter(
        (apt) => apt.confirmationStatus === 'RESCHEDULE_REQUESTED'
      ).length,
      cancelled: upcomingAppointments.filter(
        (apt) => apt.confirmationStatus === 'CANCELLED_BY_PATIENT'
      ).length,
      noResponse: upcomingAppointments.filter(
        (apt) => apt.confirmationStatus === 'NO_RESPONSE'
      ).length,
    };

    // Calculate confirmation rate
    const confirmationRate =
      stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0;

    // Get today's appointments
    const todayAppointments = upcomingAppointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfToday && aptDate <= endOfToday;
    });

    // Get appointments by day for chart
    const appointmentsByDay: Record<string, any> = {};
    upcomingAppointments.forEach((apt) => {
      const date = new Date(apt.startTime).toISOString().split('T')[0];
      if (!appointmentsByDay[date]) {
        appointmentsByDay[date] = {
          date,
          total: 0,
          confirmed: 0,
          pending: 0,
        };
      }
      appointmentsByDay[date].total++;
      if (apt.confirmationStatus === 'CONFIRMED') {
        appointmentsByDay[date].confirmed++;
      } else if (
        apt.confirmationStatus === 'PENDING' ||
        apt.confirmationStatus === 'SENT'
      ) {
        appointmentsByDay[date].pending++;
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          stats,
          confirmationRate,
          todayCount: todayAppointments.length,
          todayConfirmed: todayAppointments.filter(
            (apt) => apt.confirmationStatus === 'CONFIRMED'
          ).length,
          chartData: Object.values(appointmentsByDay),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
        },
        { status: 401 }
      );
    }

    console.error('Confirmation stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar estadísticas',
      },
      { status: 500 }
    );
  }
}
