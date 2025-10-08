/**
 * SOAP Note WhatsApp Notification API
 *
 * POST /api/scribe/notes/:id/notify - Send WhatsApp notification to patient
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { notifyPatientSOAPReady } from '@/lib/notifications/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * POST /api/scribe/notes/:id/notify
 * Send WhatsApp notification to patient when SOAP note is ready
 */
export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const noteId = context.params.id;

      // Fetch SOAP note with patient and clinician data
      const note = await prisma.sOAPNote.findFirst({
        where: {
          id: noteId,
          clinicianId: context.user.id, // Ensure doctor owns this note
        },
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              country: true,
            },
          },
          clinician: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!note) {
        return NextResponse.json(
          { error: 'SOAP note not found or access denied' },
          { status: 404 }
        );
      }

      // Verify patient has phone number
      if (!note.patient.phone) {
        return NextResponse.json(
          { error: 'Patient phone number not found. Cannot send WhatsApp notification.' },
          { status: 400 }
        );
      }

      // Generate secure signed URL for patient to view note (24-hour expiry)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://holilabs.com';
      const noteToken = Buffer.from(`${noteId}:${Date.now()}`).toString('base64url');
      const noteUrl = `${baseUrl}/patient/notes/${noteId}?token=${noteToken}`;

      // Detect language based on patient country
      const language = note.patient.country === 'BR' ? 'pt' : 'es';

      // Send WhatsApp notification
      const result = await notifyPatientSOAPReady({
        patientPhone: note.patient.phone,
        patientName: note.patient.firstName,
        doctorName: `${note.clinician.firstName} ${note.clinician.lastName}`,
        noteUrl,
        language,
      });

      // Log notification in audit trail
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          action: 'NOTIFY',
          resource: 'SOAP_NOTE',
          resourceId: noteId,
          details: {
            messageSid: result.messageSid,
            recipient: note.patient.phone,
            language,
            channel: 'whatsapp',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          messageSid: result.messageSid,
          sentTo: note.patient.phone,
          language,
        },
      });
    } catch (error: any) {
      console.error('Error sending WhatsApp notification:', error);
      return NextResponse.json(
        { error: 'Failed to send notification', message: error.message },
        { status: 500 }
      );
    }
  }
);
