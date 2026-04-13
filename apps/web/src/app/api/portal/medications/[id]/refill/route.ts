export const dynamic = "force-dynamic";
/**
 * Medication Refill Request API
 *
 * POST /api/portal/medications/[id]/refill
 * Request a refill for a medication
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { z } from 'zod';

const RefillRequestSchema = z.object({
  notes: z.string().optional(),
  pharmacy: z.string().optional(),
});

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const segments = request.nextUrl.pathname.split('/');
    const id = segments[segments.length - 2]; // /api/portal/medications/[id]/refill

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Medication ID is required',
        },
        { status: 400 }
      );
    }

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

    if (medication.patientId !== context.session.patientId) {
      logger.warn({
        event: 'unauthorized_refill_request_attempt',
        patientId: context.session.patientId,
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

    if (!medication.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'No puedes solicitar renovación de un medicamento inactivo.',
        },
        { status: 400 }
      );
    }

    const refillRequest = {
      id: `refill_${Date.now()}`,
      medicationId: medication.id,
      patientId: context.session.patientId,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      notes,
      pharmacy,
    };

    await prisma.auditLog.create({
      data: {
        userId: context.session.userId,
        userEmail: context.session.email,
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
      patientId: context.session.patientId,
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
  },
  { audit: { action: 'CREATE', resource: 'MedicationRefill' } }
);
