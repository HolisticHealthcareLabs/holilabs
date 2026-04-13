export const dynamic = "force-dynamic";
/**
 * Patient Appointments API
 *
 * GET /api/portal/appointments
 * Fetch all appointments for authenticated patient
 *
 * POST /api/portal/appointments
 * Request a new appointment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const AppointmentsQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'RESCHEDULED']).optional(),
  upcoming: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.boolean().optional()
  ),
  limit: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.coerce.number().int().min(1).max(100).default(50)
  ),
});

const CreateAppointmentSchema = z.object({
  reason: z.string().min(10, 'Describe el motivo de la consulta (mínimo 10 caracteres)'),
  preferredDate: z.string(),
  preferredTime: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
  type: z.enum(['IN_PERSON', 'VIRTUAL', 'PHONE']).default('IN_PERSON'),
  notes: z.string().optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = AppointmentsQuerySchema.safeParse({
      status: searchParams.get('status'),
      upcoming: searchParams.get('upcoming'),
      limit: searchParams.get('limit'),
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }

    const { status, upcoming, limit } = queryValidation.data;

    const where: any = {
      patientId: context.session.patientId,
    };

    if (status) {
      where.status = status;
    }

    if (upcoming !== undefined) {
      if (upcoming) {
        where.startTime = {
          gte: new Date(),
        };
        where.status = {
          in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'],
        };
      } else {
        where.OR = [
          { startTime: { lt: new Date() } },
          { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
        ];
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            licenseNumber: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
      take: limit,
    });

    const now = new Date();
    const upcomingAppointments = appointments.filter(
      (apt) =>
        apt.startTime >= now && ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'].includes(apt.status)
    );
    const pastAppointments = appointments.filter(
      (apt) =>
        apt.startTime < now ||
        ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status)
    );

    await createAuditLog({
      action: 'READ',
      resource: 'Appointment',
      resourceId: context.session.patientId,
      details: {
        patientId: context.session.patientId,
        count: appointments.length,
        upcoming: upcomingAppointments.length,
        past: pastAppointments.length,
        filters: { status, upcoming },
        accessType: 'PATIENT_APPOINTMENTS_LIST',
      },
      success: true,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          appointments,
          summary: {
            total: appointments.length,
            upcoming: upcomingAppointments.length,
            past: pastAppointments.length,
          },
          upcomingAppointments,
          pastAppointments,
        },
      },
      { status: 200 }
    );
  },
  { audit: { action: 'READ', resource: 'Appointments' } }
);

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const body = await request.json();
    const validation = CreateAppointmentSchema.safeParse(body);

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

    const { reason, preferredDate, preferredTime, type, notes, urgency } =
      validation.data;

    const appointmentType = type === 'VIRTUAL' ? 'TELEHEALTH' : type;

    const patient = await prisma.patient.findUnique({
      where: { id: context.session.patientId },
      select: {
        assignedClinicianId: true,
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!patient?.assignedClinicianId) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No tienes un médico asignado. Por favor, contacta a soporte.',
        },
        { status: 400 }
      );
    }

    const requestedDate = new Date(preferredDate);

    let appointmentStart = new Date(requestedDate);
    if (preferredTime === 'MORNING') {
      appointmentStart.setHours(9, 0, 0, 0);
    } else if (preferredTime === 'AFTERNOON') {
      appointmentStart.setHours(14, 0, 0, 0);
    } else {
      appointmentStart.setHours(17, 0, 0, 0);
    }

    const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60 * 1000);

    const descParts = [
      notes || `Solicitud de ${type === 'VIRTUAL' ? 'consulta virtual' : type === 'PHONE' ? 'consulta telefónica' : 'consulta presencial'}`,
      urgency !== 'ROUTINE' ? `[Urgencia: ${urgency}]` : '',
    ].filter(Boolean).join(' ');

    const appointment = await prisma.appointment.create({
      data: {
        patientId: context.session.patientId,
        clinicianId: patient.assignedClinicianId,
        title: reason,
        description: descParts,
        patientNotes: urgency !== 'ROUTINE' ? `Urgency: ${urgency}` : undefined,
        startTime: appointmentStart,
        endTime: appointmentEnd,
        type: appointmentType,
        status: 'SCHEDULED',
      },
      include: {
        clinician: {
          select: {
            firstName: true,
            lastName: true,
            specialty: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Appointment',
        resourceId: appointment.id,
        success: true,
        details: {
          preferredTime,
          urgency,
        },
      },
    });

    logger.info({
      event: 'appointment_requested',
      patientId: context.session.patientId,
      appointmentId: appointment.id,
      type,
      urgency,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Tu solicitud de cita ha sido enviada. Te contactaremos pronto para confirmar.',
        data: appointment,
      },
      { status: 201 }
    );
  },
  { audit: { action: 'CREATE', resource: 'Appointment' } }
);
