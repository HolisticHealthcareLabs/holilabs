/**
 * Reschedule Approval API Route
 * POST /api/appointments/[id]/reschedule/approve - Approve reschedule request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { notifyAppointmentReminder } from '@/lib/notifications/whatsapp';
import { sendEmail } from '@/lib/notifications/email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logger } from '@/lib/logger';

/**
 * POST /api/appointments/[id]/reschedule/approve
 * Approves a patient's reschedule request
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

    // Fetch appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: { preferences: true },
        },
        clinician: true,
      },
    });

    if (!appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    if (!appointment.rescheduleRequested || !appointment.rescheduleNewTime) {
      return NextResponse.json(
        { success: false, error: 'No reschedule request pending' },
        { status: 400 }
      );
    }

    // Update appointment with new time
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startTime: appointment.rescheduleNewTime,
        endTime: new Date(appointment.rescheduleNewTime.getTime() + 30 * 60 * 1000), // 30 min duration
        rescheduleApproved: true,
        rescheduleApprovedAt: new Date(),
        rescheduleApprovedBy: (session.user as any).id,
        rescheduleRequested: false,
        status: 'SCHEDULED',
        confirmationStatus: 'PENDING',
      },
      include: {
        patient: true,
        clinician: true,
      },
    });

    // Notify patient
    const newDate = format(updatedAppointment.startTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    const newTime = format(updatedAppointment.startTime, 'HH:mm', { locale: es });

    const message = `¡Buenas noticias ${appointment.patient.firstName}!\n\nTu solicitud de reagendamiento ha sido aprobada.\n\nNueva fecha: ${newDate}\nNueva hora: ${newTime}\nDoctor: ${appointment.clinician.firstName} ${appointment.clinician.lastName}\n\nGracias,\nHoli Labs`;

    // Send WhatsApp notification
    if (appointment.patient.phone && appointment.patient.preferences?.whatsappEnabled) {
      await notifyAppointmentReminder({
        patientPhone: appointment.patient.phone,
        patientName: appointment.patient.firstName,
        doctorName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
        appointmentDate: newDate,
        appointmentTime: newTime,
        clinicAddress: appointment.branch || undefined,
        language: 'es',
      });
    }

    // Send email notification
    if (appointment.patient.email && appointment.patient.preferences?.emailEnabled) {
      await sendEmail({
        to: appointment.patient.email,
        subject: '✅ Reagendamiento Aprobado',
        html: message.replace(/\n/g, '<br>'),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'UPDATE',
        resource: 'Appointment',
        resourceId: appointmentId,
        details: {
          action: 'reschedule_approved',
          oldTime: appointment.startTime,
          newTime: updatedAppointment.startTime,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { appointment: updatedAppointment },
      message: 'Reschedule request approved',
    });
  } catch (error: any) {
    logger.error({
      event: 'appointment_reschedule_approve_failed',
      appointmentId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to approve reschedule' },
      { status: 500 }
    );
  }
}
