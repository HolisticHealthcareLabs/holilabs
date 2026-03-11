/**
 * Appointment Notification API Route
 * POST /api/appointments/[id]/notify - Send notification to patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { notifyAppointmentReminder } from '@/lib/notifications/whatsapp';
import { sendEmail } from '@/lib/notifications/email';
import { sendSMS } from '@/lib/notifications/sms';
import { sendPushNotification } from '@/lib/notifications/send-push';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { logger } from '@/lib/logger';

type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push' | 'in-app' | 'all';
type NotificationType = 'payment_reminder' | 'appointment_reminder' | 'followup';

/**
 * POST /api/appointments/[id]/notify
 * Sends notification to patient via specified channel(s)
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? {});
    const appointmentId = params.id;
    if (!appointmentId) {
      return NextResponse.json(
        { success: false, error: 'Appointment ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      channel,
      type = 'appointment_reminder',
      followUpNumber = 0,
    } = body as {
      channel: NotificationChannel;
      type?: NotificationType;
      followUpNumber?: number;
    };

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'channel is required' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          include: {
            preferences: true,
          },
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

    const patient = appointment.patient;
    const preferences = patient.preferences;

    const appointmentDate = format(appointment.startTime, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    const appointmentTime = format(appointment.startTime, 'HH:mm', { locale: es });

    let message = '';
    let subject = '';

    if (type === 'payment_reminder') {
      subject = '💰 Recordatorio de Pago Pendiente';
      message = `Hola ${patient.firstName},\n\nTe recordamos que tienes un pago pendiente para tu cita del ${appointmentDate} a las ${appointmentTime}.\n\nPor favor ponte en contacto con nosotros para resolver este asunto.\n\nGracias,\nHoli Labs`;
    } else if (type === 'followup') {
      subject = `🔔 Seguimiento ${followUpNumber > 0 ? followUpNumber : ''} - Recordatorio de Cita`;
      message = `Hola ${patient.firstName},\n\nEste es un recordatorio de seguimiento ${followUpNumber > 0 ? `#${followUpNumber}` : ''} sobre tu cita:\n\n📅 Fecha: ${appointmentDate}\n⏰ Hora: ${appointmentTime}\n👨‍⚕️ Doctor: ${appointment.clinician.firstName} ${appointment.clinician.lastName}\n\n${appointment.branch ? `📍 Sucursal: ${appointment.branch}` : ''}\n\nPor favor confirma tu asistencia respondiendo a este mensaje.\n\nGracias,\nHoli Labs`;
    } else {
      subject = '📅 Recordatorio de Cita Médica';
      message = `Hola ${patient.firstName},\n\nTe recordamos tu cita médica:\n\n📅 Fecha: ${appointmentDate}\n⏰ Hora: ${appointmentTime}\n👨‍⚕️ Doctor: ${appointment.clinician.firstName} ${appointment.clinician.lastName}\n\n${appointment.branch ? `📍 Sucursal: ${appointment.branch}` : ''}\n\nPor favor confirma tu asistencia.\n\nGracias,\nHoli Labs`;
    }

    const results: any[] = [];
    const channels = channel === 'all' ? ['whatsapp', 'email', 'push'] : [channel];
    const userId = context.user!.id;

    for (const ch of channels) {
      try {
        if (ch === 'whatsapp' && patient.phone && preferences?.whatsappEnabled) {
          const whatsappResult = await notifyAppointmentReminder({
            patientPhone: patient.phone,
            patientName: patient.firstName,
            doctorName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}`,
            appointmentDate,
            appointmentTime,
            clinicAddress: appointment.branch || undefined,
            language: 'es',
          });
          results.push({ channel: 'whatsapp', success: whatsappResult.success });
        } else if (ch === 'email' && patient.email && preferences?.emailEnabled) {
          const emailResult = await sendEmail({
            to: patient.email,
            subject,
            html: message.replace(/\n/g, '<br>'),
          });
          results.push({ channel: 'email', success: emailResult });
        } else if (ch === 'sms' && patient.phone && preferences?.smsEnabled) {
          const smsResult = await sendSMS({ to: patient.phone, message });
          results.push({ channel: 'sms', success: smsResult });
        } else if ((ch === 'push' || ch === 'in-app') && preferences?.pushEnabled) {
          const pushResult = await sendPushNotification({
            userId: patient.id,
            payload: {
              title: subject,
              body: message,
              data: {
                appointmentId,
                type,
                userType: 'PATIENT',
              },
            },
          });
          results.push({ channel: 'push', success: pushResult.success });
        }
      } catch (error) {
        logger.error({
          event: 'appointment_notification_channel_failed',
          appointmentId,
          channel: ch,
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        results.push({ channel: ch, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (type === 'followup') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          followUpCount: (appointment.followUpCount || 0) + 1,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'NOTIFY',
        resource: 'Appointment',
        resourceId: appointmentId,
        details: {
          type,
          channels,
          results,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: { results },
      message: 'Notifications sent',
    });
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN', 'ADMIN'],
    rateLimit: { windowMs: 60_000, maxRequests: 60 },
  }
);
