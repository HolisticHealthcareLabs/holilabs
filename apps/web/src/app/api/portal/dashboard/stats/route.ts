/**
 * Portal Dashboard Stats API
 *
 * GET /api/portal/dashboard/stats - Get patient's personal dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();
    const patientId = session.patientId;

    // Fetch all stats in parallel for performance
    const [
      upcomingAppointments,
      activeMedications,
      unreadNotifications,
      totalDocuments,
      recentConsultations,
      pendingForms,
    ] = await Promise.all([
      // Upcoming appointments (future appointments)
      prisma.appointment.findMany({
        where: {
          patientId,
          startTime: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        orderBy: { startTime: 'asc' },
        take: 5,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          notes: true,
          status: true,
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
        },
      }),

      // Active medications
      prisma.medication.count({
        where: {
          patientId,
          isActive: true,
        },
      }),

      // Unread notifications
      prisma.patientNotification.count({
        where: {
          patientUserId: session.patientUserId,
          isRead: false,
        },
      }),

      // Total documents
      prisma.document.count({
        where: {
          patientId,
        },
      }),

      // Recent consultations (last 90 days)
      prisma.clinicalNote.findMany({
        where: {
          patientId,
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true,
          noteType: true,
          createdAt: true,
          clinician: {
            select: {
              firstName: true,
              lastName: true,
              specialty: true,
            },
          },
        },
      }),

      // Pending forms
      prisma.formInstance.count({
        where: {
          patientId,
          status: 'PENDING',
        },
      }),
    ]);

    // Calculate next appointment date
    const nextAppointment = upcomingAppointments[0];
    const nextAppointmentDate = nextAppointment
      ? new Date(nextAppointment.startTime)
      : null;

    const daysUntilNextAppointment = nextAppointmentDate
      ? Math.ceil(
          (nextAppointmentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Calculate medication adherence (mock for now - would need actual tracking)
    const medicationAdherence = activeMedications > 0 ? 95 : 100;

    return NextResponse.json({
      success: true,
      stats: {
        upcomingAppointments: {
          count: upcomingAppointments.length,
          next: nextAppointment
            ? {
                id: nextAppointment.id,
                date: nextAppointment.startTime,
                clinician: `Dr. ${nextAppointment.clinician.firstName} ${nextAppointment.clinician.lastName}`,
                specialty: nextAppointment.clinician.specialty,
                daysUntil: daysUntilNextAppointment,
              }
            : null,
          all: upcomingAppointments.map((apt) => ({
            id: apt.id,
            date: apt.startTime,
            endTime: apt.endTime,
            clinician: `Dr. ${apt.clinician.firstName} ${apt.clinician.lastName}`,
            specialty: apt.clinician.specialty,
            notes: apt.notes,
            status: apt.status,
          })),
        },
        medications: {
          active: activeMedications,
          adherence: medicationAdherence,
        },
        notifications: {
          unread: unreadNotifications,
        },
        documents: {
          total: totalDocuments,
        },
        consultations: {
          recent: recentConsultations.map((note) => ({
            id: note.id,
            type: note.noteType,
            date: note.createdAt,
            clinician: `Dr. ${note.clinician.firstName} ${note.clinician.lastName}`,
            specialty: note.clinician.specialty,
          })),
        },
        forms: {
          pending: pendingForms,
        },
      },
    });
  } catch (error) {
    logger.error({
      event: 'portal_dashboard_stats_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar las estadísticas del portal.',
      },
      { status: 500 }
    );
  }
}
