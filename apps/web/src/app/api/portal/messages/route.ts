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
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

// Create message schema
const CreateMessageSchema = z.object({
  content: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje es demasiado largo'),
  type: z.enum(['TEXT', 'QUESTION', 'URGENT']).default('TEXT'),
});

export async function GET(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Get patient's assigned clinician
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: {
        assignedClinicianId: true,
        assignedClinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialty: true,
            // TODO: user relation doesn't exist in Prisma schema yet
            // user: {
            //   select: {
            //     profilePictureUrl: true,
            //   },
            // },
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

    // Parse query parameters for pagination
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const before = searchParams.get('before'); // Message ID for pagination

    // Build where clause for message filtering
    // In a real system, you'd have a Messages table with senderId/receiverId
    // For now, we'll use ClinicalNotes as a proxy for communication
    // This is a simplified version - in production you'd have a dedicated Messages table

    // For demo purposes, we'll create a mock messages structure
    // In production, you would query a Messages table like:
    // const messages = await prisma.message.findMany({
    //   where: {
    //     OR: [
    //       { senderId: session.userId, receiverId: patient.assignedClinician.user.id },
    //       { senderId: patient.assignedClinician.user.id, receiverId: session.userId },
    //     ],
    //   },
    //   orderBy: { createdAt: 'desc' },
    //   take: limit,
    // });

    // For now, return empty messages with clinician info
    const messages: any[] = [];

    logger.info({
      event: 'patient_messages_fetched',
      patientId: session.patientId,
      patientUserId: session.userId,
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'patient_messages_fetch_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al cargar mensajes.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Parse and validate request body
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

    // Get patient's assigned clinician
    const patient = await prisma.patient.findUnique({
      where: { id: session.patientId },
      select: {
        assignedClinicianId: true,
        assignedClinician: {
          select: {
            id: true,
            // TODO: user relation doesn't exist in Prisma schema yet
            // user: {
            //   select: {
            //     id: true,
            //   },
            // },
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

    // In production, you would create a Message record:
    // const message = await prisma.message.create({
    //   data: {
    //     senderId: session.userId,
    //     receiverId: patient.assignedClinician.user.id,
    //     content,
    //     type,
    //     sentAt: new Date(),
    //   },
    // });

    // For demo, create a mock message
    const message = {
      id: `msg_${Date.now()}`,
      content,
      type,
      sentAt: new Date().toISOString(),
      senderId: session.userId,
      receiverId: patient.assignedClinicianId, // Using clinicianId directly since user relation doesn't exist
      isRead: false,
    };

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userEmail: session.email,
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
      patientId: session.patientId,
      patientUserId: session.userId,
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
  } catch (error) {
    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado. Por favor, inicia sesión.',
        },
        { status: 401 }
      );
    }

    logger.error({
      event: 'message_send_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al enviar mensaje.',
      },
      { status: 500 }
    );
  }
}
