/**
 * Appointment Notification API Route
 * POST /api/appointments/[id]/notify - Send notification to patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
// FIXME: Old rate limiting API - needs refactor to use checkRateLimit from @/lib/rate-limit
// import { rateLimit } from '@/lib/rate-limit';
// import { sendWhatsAppMessage } from '@/lib/notifications/whatsapp'; // Function doesn't exist
import { sendEmail } from '@/lib/notifications/email';
import { sendSMS } from '@/lib/notifications/sms';
import { sendPushNotification } from '@/lib/notifications/send-push';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// FIXME: Old rate limiting - commented out for now
// const limiter = rateLimit({
//   interval: 60 * 1000,
//   uniqueTokenPerInterval: 500,
// });

type NotificationChannel = 'whatsapp' | 'email' | 'sms' | 'push' | 'in-app' | 'all';
type NotificationType = 'payment_reminder' | 'appointment_reminder' | 'followup';

/**
 * POST /api/appointments/[id]/notify
 * Sends notification to patient via specified channel(s)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // FIXME: Rate limiting disabled - needs refactor
    // await limiter.check(request, 20, 'APPOINTMENT_NOTIFY');

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const appointmentId = params.id;
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

    // Validation
    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'channel is required' },
        { status: 400 }
      );
    }

    // Fetch appointment with patient and clinician details
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

    // Build notification message
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

    // Send via each channel
    for (const ch of channels) {
      try {
        if (ch === 'whatsapp' && patient.phone && preferences?.whatsappEnabled) {
          // FIXME: sendWhatsAppMessage doesn't exist - needs proper WhatsApp function
          // const whatsappResult = await sendWhatsAppMessage(patient.phone, message);
          // results.push({ channel: 'whatsapp', success: whatsappResult.success });
          console.warn('WhatsApp notifications not configured');
          results.push({ channel: 'whatsapp', success: false, error: 'Not implemented' });
        } else if (ch === 'email' && patient.email && preferences?.emailEnabled) {
          const emailResult = await sendEmail({
            to: patient.email,
            subject,
            html: message.replace(/\n/g, '<br>'),
          });
          results.push({ channel: 'email', success: emailResult });
        } else if (ch === 'sms' && patient.phone && preferences?.smsEnabled) {
          const smsResult = await sendSMS({ to: patient.phone, message }); // Fixed: use object params
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
                userType: 'PATIENT', // Moved to data
              },
            },
          });
          results.push({ channel: 'push', success: pushResult.success });
        }
      } catch (error: any) {
        console.error(`Error sending via ${ch}:`, error);
        results.push({ channel: ch, success: false, error: error.message });
      }
    }

    // Update appointment with follow-up count if this is a follow-up
    if (type === 'followup') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          followUpCount: (appointment.followUpCount || 0) + 1,
        },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
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
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}
