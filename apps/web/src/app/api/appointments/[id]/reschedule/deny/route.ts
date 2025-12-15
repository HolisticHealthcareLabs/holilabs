/**
 * Reschedule Denial API Route
 * POST /api/appointments/[id]/reschedule/deny - Deny reschedule request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/notifications/email';
import { logger } from '@/lib/logger';

/**
 * POST /api/appointments/[id]/reschedule/deny
 * Denies a patient's reschedule request
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
    const { reason } = body;

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

    if (!appointment.rescheduleRequested) {
      return NextResponse.json(
        { success: false, error: 'No reschedule request pending' },
        { status: 400 }
      );
    }

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        rescheduleApproved: false,
        rescheduleApprovedAt: new Date(),
        rescheduleApprovedBy: (session.user as any).id,
        rescheduleRequested: false,
        rescheduleReason: reason || appointment.rescheduleReason,
      },
    });

    // Notify patient
    const message = `Hola ${appointment.patient.firstName},\n\nLamentamos informarte que tu solicitud de reagendamiento no pudo ser aprobada${reason ? `: ${reason}` : ''}.\n\nPor favor contacta al consultorio directamente para encontrar una nueva fecha que funcione para ambas partes.\n\nGracias,\nHoli Labs`;

    // Send notifications
    if (appointment.patient.phone && appointment.patient.preferences?.whatsappEnabled) {
      // FIXME: sendWhatsAppMessage doesn't exist - needs proper WhatsApp function
      // await sendWhatsAppMessage(appointment.patient.phone, message);
      logger.warn({
        event: 'appointment_whatsapp_notification_skipped',
        reason: 'WhatsApp notifications not configured',
        appointmentId,
        patientId: appointment.patient.id,
      });
    }

    if (appointment.patient.email && appointment.patient.preferences?.emailEnabled) {
      await sendEmail({
        to: appointment.patient.email,
        subject: 'ℹ️ Reagendamiento No Aprobado',
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
          action: 'reschedule_denied',
          reason,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { appointment: updatedAppointment },
      message: 'Reschedule request denied',
    });
  } catch (error: any) {
    logger.error({
      event: 'appointment_reschedule_deny_failed',
      appointmentId: params.id,
      error: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to deny reschedule' },
      { status: 500 }
    );
  }
}
