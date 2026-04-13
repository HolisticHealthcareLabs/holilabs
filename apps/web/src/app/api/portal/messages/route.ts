export const dynamic = "force-dynamic";
/**
 * Patient Messages API
 *
 * GET /api/portal/messages
 * Fetch conversation with assigned clinician
 *
 * POST /api/portal/messages
 * Send a new message to clinician
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

const CreateMessageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje es demasiado largo'),
  type: z.enum(['TEXT', 'QUESTION', 'URGENT']).default('TEXT'),
});

export const GET = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const patient = await prisma.patient.findUnique({
      where: { id: context.session.patientId },
      select: {
        assignedClinicianId: true,
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            profilePictureUrl: true,
          },
        },
      },
    });

    if (!patient?.assignedClinicianId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes un médico asignado.',
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before');

    const messages: any[] = [];

    logger.info({
      event: 'patient_messages_fetched',
      patientId: context.session.patientId,
      clinicianId: patient.assignedClinicianId,
      count: messages.length,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          messages,
          clinician: patient.assignedClinician,
          hasMore: false,
        },
      },
      { status: 200 }
    );
  },
  { audit: { action: 'READ', resource: 'Messages' } }
);

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const body = await request.json();
    const validation = CreateMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos inválidos',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { content, type } = validation.data;

    const patient = await prisma.patient.findUnique({
      where: { id: context.session.patientId },
      select: {
        assignedClinicianId: true,
        assignedClinician: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!patient?.assignedClinicianId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes un médico asignado.',
        },
        { status: 400 }
      );
    }

    const message = {
      id: `msg_${Date.now()}`,
      content,
      type,
      sentAt: new Date().toISOString(),
      senderId: context.session.userId,
      receiverId: patient.assignedClinicianId,
      isRead: false,
    };

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'Message',
        resourceId: message.id,
        success: true,
        details: {
          type,
          contentLength: content.length,
        },
      },
    });

    logger.info({
      event: 'message_sent',
      patientId: context.session.patientId,
      clinicianId: patient.assignedClinicianId,
      messageId: message.id,
      type,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Mensaje enviado correctamente.',
        data: message,
      },
      { status: 201 }
    );
  },
  { audit: { action: 'CREATE', resource: 'Message' } }
);
