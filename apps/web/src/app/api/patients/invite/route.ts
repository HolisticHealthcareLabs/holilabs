/**
 * Patient Invitation API
 *
 * POST /api/patients/invite - Send secure invitation to patient for portal access
 *
 * Features:
 * - Multi-channel delivery (email, SMS, WhatsApp)
 * - Magic link generation with JWT
 * - HIPAA-compliant audit logging
 * - Custom message support
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import { z } from 'zod';
import { SignJWT } from 'jose';
import logger from '@/lib/logger';
import { createAuditLog } from '@/lib/audit';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Validation schema
const InvitePatientSchema = z.object({
  patientId: z.string().uuid('Patient ID must be a valid UUID'),
  channels: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1, 'At least one channel required'),
  customMessage: z.string().optional(),
  includePortalAccess: z.boolean().default(true),
});

/**
 * POST /api/patients/invite
 * Send invitation to patient
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const validation = InvitePatientSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            details: validation.error.errors,
          },
          { status: 400 }
        );
      }

      const { patientId, channels, customMessage, includePortalAccess } = validation.data;

      // ===================================================================
      // SECURITY: Verify patient belongs to current clinician (tenant isolation)
      // ===================================================================
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          assignedClinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!patient) {
        return NextResponse.json(
          {
            success: false,
            error: 'Patient not found',
          },
          { status: 404 }
        );
      }

      // Verify patient belongs to requesting clinician
      if (patient.assignedClinicianId !== context.user.id && context.user.role !== 'ADMIN') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: You do not have access to this patient',
          },
          { status: 403 }
        );
      }

      // Validate patient has contact information
      if (!patient.email && !patient.phone) {
        return NextResponse.json(
          {
            success: false,
            error: 'Patient must have email or phone number',
          },
          { status: 400 }
        );
      }

      // ===================================================================
      // GENERATE MAGIC LINK
      // ===================================================================
      const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
      if (!jwtSecret) {
        logger.error({
          event: 'invitation_error',
          error: 'JWT_SECRET not configured',
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Server configuration error',
          },
          { status: 500 }
        );
      }

      // Create invitation token (expires in 7 days)
      const secret = new TextEncoder().encode(jwtSecret);
      const invitationToken = await new SignJWT({
        patientId: patient.id,
        email: patient.email,
        phone: patient.phone,
        firstName: patient.firstName,
        lastName: patient.lastName,
        clinicianId: context.user.id,
        type: 'patient_invitation',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret);

      // Build magic link
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const magicLink = `${baseUrl}/portal/auth/register?token=${invitationToken}`;

      // ===================================================================
      // PREPARE INVITATION MESSAGES
      // ===================================================================
      const clinicianName = `${patient.assignedClinician?.firstName || 'Dr.'} ${patient.assignedClinician?.lastName || ''}`.trim();
      const patientName = `${patient.firstName} ${patient.lastName}`;

      const emailSubject = `Invitación al Portal de Pacientes - Holi Labs`;
      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏥 Bienvenido a Holi Labs</h1>
            </div>
            <div class="content">
              <p>Hola <strong>${patientName}</strong>,</p>

              <p>${clinicianName} te ha invitado a unirte al portal de pacientes de Holi Labs.</p>

              ${customMessage ? `<p><em>"${customMessage}"</em></p>` : ''}

              <p><strong>¿Qué puedes hacer en el portal?</strong></p>
              <ul>
                <li>📋 Ver tu historial médico completo</li>
                <li>📅 Agendar y gestionar tus citas</li>
                <li>💊 Consultar recetas y medicamentos</li>
                <li>📄 Acceder a resultados de laboratorio</li>
                <li>💬 Comunicarte con tu equipo médico</li>
              </ul>

              ${includePortalAccess ? `
                <p>Haz clic en el botón de abajo para crear tu cuenta:</p>
                <div style="text-align: center;">
                  <a href="${magicLink}" class="button">Crear Mi Cuenta</a>
                </div>
                <p style="font-size: 12px; color: #6b7280;">Este enlace es válido por 7 días. Si tienes problemas, copia y pega este enlace en tu navegador:<br><a href="${magicLink}" style="word-break: break-all;">${magicLink}</a></p>
              ` : ''}

              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            <div class="footer">
              <p>Holi Labs - Plataforma de Salud Digital</p>
              <p>Este correo fue enviado por ${clinicianName}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const smsMessage = customMessage
        ? `Hola ${patient.firstName}, ${clinicianName} te invita a Holi Labs. ${customMessage} ${includePortalAccess ? `Regístrate aquí: ${magicLink}` : ''}`
        : `Hola ${patient.firstName}, ${clinicianName} te invita al portal de pacientes de Holi Labs. ${includePortalAccess ? `Crea tu cuenta: ${magicLink}` : ''}`;

      // ===================================================================
      // SEND INVITATIONS
      // ===================================================================
      const results: any = {
        email: null,
        sms: null,
        whatsapp: null,
      };

      // Email
      if (channels.includes('email') && patient.email) {
        const emailResult = await sendEmail({
          to: patient.email,
          subject: emailSubject,
          html: emailBody,
          tags: [
            { name: 'type', value: 'patient_invitation' },
            { name: 'clinician_id', value: context.user.id },
          ],
        });
        results.email = emailResult;
      }

      // SMS
      if (channels.includes('sms') && patient.phone) {
        const smsResult = await sendSMS({
          to: patient.phone,
          message: smsMessage.substring(0, 1600), // SMS limit
        });
        results.sms = smsResult;
      }

      // WhatsApp (via Twilio - same as SMS but with WhatsApp prefix)
      if (channels.includes('whatsapp') && patient.phone) {
        // WhatsApp requires phone in format: whatsapp:+521234567890
        const whatsappMessage = smsMessage.substring(0, 1600);

        try {
          // For MVP, we'll log this as a todo since WhatsApp Business API requires approval
          logger.info({
            event: 'whatsapp_invitation_requested',
            patientId: patient.id,
            phone: patient.phone,
            message: 'WhatsApp invitation requires Twilio Business API approval',
          });

          results.whatsapp = {
            success: false,
            pending: true,
            message: 'WhatsApp requires Business API approval',
          };
        } catch (error: any) {
          logger.error({
            event: 'whatsapp_invitation_error',
            patientId: patient.id,
            error: error.message,
          });
          results.whatsapp = {
            success: false,
            error: error.message,
          };
        }
      }

      // ===================================================================
      // AUDIT LOGGING (HIPAA Compliance)
      // ===================================================================
      const successfulChannels = Object.keys(results).filter(
        (channel) => results[channel]?.success === true
      );

      logger.info({
        event: 'patient_invitation_sent',
        patientId: patient.id,
        clinicianId: context.user.id,
        channels: successfulChannels,
        includePortalAccess,
        timestamp: new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });

      // HIPAA Audit Log: Patient invited to portal
      await createAuditLog({
        userId: context.user.id,
        userEmail: context.user.email || 'unknown',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        action: 'INVITE',
        resource: 'Patient',
        resourceId: patient.id,
        details: {
          channels: successfulChannels,
          requestedChannels: channels,
          includePortalAccess,
          hasCustomMessage: !!customMessage,
          patientEmail: !!patient.email,
          patientPhone: !!patient.phone,
        },
        success: successfulChannels.length > 0,
        request,
      });

      // Update patient last contacted timestamp
      // ===================================================================
      // RESPONSE
      // ===================================================================
      const hasSuccess = successfulChannels.length > 0;
      const hasFailure = Object.keys(results).some(
        (channel) => results[channel] && results[channel].success === false && !results[channel].pending
      );

      return NextResponse.json(
        {
          success: hasSuccess,
          message: hasSuccess
            ? `Invitation sent successfully via ${successfulChannels.join(', ')}`
            : 'Failed to send invitation',
          results,
          magicLink: includePortalAccess ? magicLink : undefined,
        },
        { status: hasSuccess ? 200 : 500 }
      );
    } catch (error: any) {
      logger.error({
        event: 'invitation_error',
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send invitation',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 10, // Max 10 invitations per minute
    },
    skipCsrf: true,
  }
);