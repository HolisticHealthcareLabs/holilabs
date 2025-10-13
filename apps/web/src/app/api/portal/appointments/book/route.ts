/**
 * Book Appointment API
 * Creates a new appointment and sends confirmation notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { parse, addMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';

const bookingSchema = z.object({
  clinicianId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  time: z.string().regex(/^\d{2}:\d{2}$/), // HH:mm
  type: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE']),
  reason: z.string().min(3).max(500),
  notes: z.string().max(1000).optional(),
});

const APPOINTMENT_DURATION_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse request body
    const body = await request.json();
    const validated = bookingSchema.parse(body);

    // Get patient info
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get clinician info
    const clinician = await prisma.user.findUnique({
      where: { id: validated.clinicianId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!clinician || clinician.role !== 'CLINICIAN') {
      return NextResponse.json(
        { success: false, error: 'Clinician not found' },
        { status: 404 }
      );
    }

    // Parse datetime
    const startTime = parse(
      `${validated.date} ${validated.time}`,
      'yyyy-MM-dd HH:mm',
      new Date()
    );
    const endTime = addMinutes(startTime, APPOINTMENT_DURATION_MINUTES);

    // Check if slot is still available (race condition protection)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        clinicianId: validated.clinicianId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        OR: [
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'This time slot is no longer available',
        },
        { status: 409 }
      );
    }

    // Generate title based on type
    const typeLabels = {
      IN_PERSON: 'Consulta Presencial',
      TELEHEALTH: 'Consulta Virtual',
      PHONE: 'Consulta Telefónica',
    };

    const title = `${typeLabels[validated.type]} - ${validated.reason}`;

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: session.patientId,
        clinicianId: validated.clinicianId,
        title,
        description: validated.notes || null,
        startTime,
        endTime,
        type: validated.type,
        status: 'SCHEDULED',
      },
      include: {
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'APPOINTMENT_CREATED',
        resourceType: 'APPOINTMENT',
        resourceId: appointment.id,
        details: {
          clinicianId: validated.clinicianId,
          startTime: startTime.toISOString(),
          type: validated.type,
          reason: validated.reason,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Format date for notifications
    const formattedDate = format(startTime, "EEEE, d 'de' MMMM 'a las' HH:mm", {
      locale: es,
    });

    // Send confirmation notification to patient
    await prisma.notification.create({
      data: {
        recipientId: session.patientId,
        recipientType: 'PATIENT',
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Cita confirmada',
        message: `Tu cita con Dr. ${clinician.firstName} ${clinician.lastName} ha sido confirmada para el ${formattedDate}`,
        priority: 'HIGH',
        actionUrl: `/portal/dashboard/appointments/${appointment.id}`,
        actionLabel: 'Ver detalles',
      },
    });

    // Send notification to clinician
    await prisma.notification.create({
      data: {
        recipientId: clinician.id,
        recipientType: 'CLINICIAN',
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Nueva cita agendada',
        message: `${patient.firstName} ${patient.lastName} ha agendado una cita para el ${formattedDate}`,
        priority: 'NORMAL',
        actionUrl: `/clinician/appointments/${appointment.id}`,
        actionLabel: 'Ver detalles',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          title: appointment.title,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          type: appointment.type,
          status: appointment.status,
          clinician: {
            name: `Dr. ${clinician.firstName} ${clinician.lastName}`,
            email: clinician.email,
          },
        },
      },
      message: 'Appointment booked successfully',
    });
  } catch (error) {
    console.error('Appointment booking error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid booking data',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to book appointment',
      },
      { status: 500 }
    );
  }
}
