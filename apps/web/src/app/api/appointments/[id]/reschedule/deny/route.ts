/**
 * Reschedule Denial API Route
 * POST /api/appointments/[id]/reschedule/deny - Deny reschedule request
 *
 * @compliance HIPAA, createProtectedRoute auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail } from '@/lib/notifications/email';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DenySchema = z.object({
  reason: z.string().max(1000).optional(),
});

/**
 * POST /api/appointments/[id]/reschedule/deny
 * Denies a patient's reschedule request
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

      const body = await request.json();
      const parsed = DenySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: parsed.error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      const { reason } = parsed.data;

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

      if (!appointment.rescheduleRequested) {
        return NextResponse.json(
          { error: 'No reschedule request pending' },
          { status: 400 }
        );
      }

      // Update appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          rescheduleApproved: false,
          rescheduleApprovedAt: new Date(),
          rescheduleApprovedBy: context.user.id,
          rescheduleRequested: false,
          rescheduleReason: reason || appointment.rescheduleReason,
        },
      });

      // Notify patient
      const message = `Hola ${appointment.patient.firstName},\n\nLamentamos informarte que tu solicitud de reagendamiento no pudo ser aprobada${reason ? `: ${reason}` : ''}.\n\nPor favor contacta al consultorio directamente para encontrar una nueva fecha que funcione para ambas partes.\n\nGracias,\nHoli Labs`;

      // Send notifications
      if (appointment.patient.phone && appointment.patient.preferences?.whatsappEnabled) {
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
          userId: context.user.id,
          userEmail: context.user.email || 'unknown',
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
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to deny reschedule request' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60_000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'Appointment' },
  }
);
