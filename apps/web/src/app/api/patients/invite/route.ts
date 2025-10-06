/**
 * Patient Invitation API
 * Send invitations to patients for portal access
 *
 * POST /api/patients/invite - Send invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications';
import { WhatsAppTemplates } from '@/lib/notifications/whatsapp';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const { patientId, channels, customMessage, includePortalAccess } = body;

      if (!patientId) {
        return NextResponse.json(
          { error: 'Patient ID is required' },
          { status: 400 }
        );
      }

      // Get patient
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Generate invitation token (valid for 7 days)
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation record (you'd need an Invitation model in Prisma)
      // For now, we'll just send the notification

      // Build invitation message
      const clinicName = 'Holi Labs';
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com'}/portal/signup?token=${token}`;

      let message = customMessage || WhatsAppTemplates.welcomeMessage(
        patient.firstName,
        clinicName
      );

      if (includePortalAccess) {
        message += `\n\n🔐 Accede a tu portal de pacientes: ${inviteUrl}`;
      }

      // Send notification
      const result = await sendNotification({
        to: {
          email: patient.email || undefined,
          phone: patient.phone || undefined,
        },
        channels: channels || ['email'],
        subject: `Invitación al Portal de Pacientes - ${clinicName}`,
        message,
        priority: 'high',
      });

      // Log invitation
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email || 'system',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'CREATE',
          resource: 'PatientInvitation',
          resourceId: patientId,
          success: result.success,
          details: {
            channels,
            includePortalAccess,
            deliveryStatus: result.channels,
          },
        },
      });

      if (!result.success) {
        return NextResponse.json(
          {
            error: 'Failed to send invitation',
            details: result.channels,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        data: {
          patientId,
          channels: result.channels,
          expiresAt,
        },
      });
    } catch (error: any) {
      console.error('Patient invitation error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'],
    rateLimit: { windowMs: 60000, maxRequests: 20 },
  }
);
