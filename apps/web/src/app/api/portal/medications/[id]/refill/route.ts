/**
 * Medication Refill Request API
 *
 * POST /api/portal/medications/[id]/refill
 * Request a refill for a medication
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

const RefillRequestSchema = z.object({
  notes: z.string().optional(),
  pharmacy: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medication ID is required',
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = RefillRequestSchema.safeParse(body);

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

    const { notes, pharmacy } = validation.data;

    // Fetch medication
    const medication = await prisma.medication.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        name: true,
        isActive: true,
      },
    });

    if (!medication) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medicamento no encontrado.',
        },
        { status: 404 }
      );
    }

    // Verify the medication belongs to the authenticated patient
    if (medication.patientId !== session.patientId) {
      logger.warn({
        event: 'unauthorized_refill_request_attempt',
        patientId: session.patientId,
        requestedMedicationId: id,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permiso para solicitar renovación de este medicamento.',
        },
        { status: 403 }
      );
    }

    // Check if medication is active
    if (!medication.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes solicitar renovación de un medicamento inactivo.',
        },
        { status: 400 }
      );
    }

    // In production, you would create a RefillRequest record
    // For now, we'll create a mock refill request and log it
    const refillRequest = {
      id: `refill_${Date.now()}`,
      medicationId: medication.id,
      patientId: session.patientId,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      notes,
      pharmacy,
    };

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        userEmail: session.email,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'CREATE',
        resource: 'RefillRequest',
        resourceId: refillRequest.id,
        success: true,
        details: {
          medicationId: medication.id,
          medicationName: medication.name,
          notes,
          pharmacy,
        },
      },
    });

    logger.info({
      event: 'refill_requested',
      patientId: session.patientId,
      medicationId: medication.id,
      refillRequestId: refillRequest.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Solicitud de renovación enviada. Tu médico la revisará pronto.',
        data: refillRequest,
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
      event: 'refill_request_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Error al solicitar renovación.',
      },
      { status: 500 }
    );
  }
}
