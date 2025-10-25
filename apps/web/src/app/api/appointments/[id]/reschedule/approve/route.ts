/**
 * Reschedule Approval API Route
 * POST /api/appointments/[id]/reschedule/approve - Approve reschedule request
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// FIXME: Old rate limiting API - needs refactor
// import { rateLimit } from '@/lib/rate-limit';
// import { sendWhatsAppMessage } from '@/lib/notifications/whatsapp'; // Function doesn't exist
import { sendEmail } from '@/lib/notifications/email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// FIXME: Old rate limiting - commented out for now
// const limiter = rateLimit({
//   interval: 60 * 1000,
//   uniqueTokenPerInterval: 500,
// });

/**
 * POST /api/appointments/[id]/reschedule/approve
 * Approves a patient's reschedule request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // FIXME: Rate limiting disabled - needs refactor
    // await limiter.check(request, 20, 'RESCHEDULE_APPROVE');

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
      // FIXME: sendWhatsAppMessage doesn't exist - needs proper WhatsApp function
      // await sendWhatsAppMessage(appointment.patient.phone, message);
      console.warn('WhatsApp notifications not configured');
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
    console.error('Error approving reschedule:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve reschedule' },
      { status: 500 }
    );
  }
}
