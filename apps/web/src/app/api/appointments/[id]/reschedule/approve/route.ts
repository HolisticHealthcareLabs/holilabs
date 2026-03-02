/**
 * Reschedule Approval API Route
 * POST /api/appointments/[id]/reschedule/approve - Approve reschedule request
 *
 * @compliance HIPAA, createProtectedRoute auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { prisma } from '@/lib/prisma';
import { notifyAppointmentReminder } from '@/lib/notifications/whatsapp';
import { sendEmail } from '@/lib/notifications/email';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/appointments/[id]/reschedule/approve
 * Approves a patient's reschedule request
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const appointmentId = context.params?.id;

      if (!appointmentId) {
        return NextResponse.json(
          { error: 'Appointment ID is required' },
          { status: 400 }
        );
      }

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
          { error: 'Appointment not found' },
          { status: 404 }
        );
      }

      if (!appointment.rescheduleRequested || !appointment.rescheduleNewTime) {
        return NextResponse.json(
          { error: 'No reschedule request pending' },
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
          rescheduleApprovedBy: context.user.id,
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
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
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
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to approve reschedule request' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
  }
);
