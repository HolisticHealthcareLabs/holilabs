/**
 * Clinician → Patient Access Request (QR flow)
 *
 * POST /api/access/request
 * Body: { patientTokenId: string, purpose?: string }
 *
 * Creates a patient notification prompting them to approve/reject access.
 * This v1 implementation grants access by setting patient.assignedClinicianId
 * upon approval (uses existing enforcement paths).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  patientTokenId: z.string().min(3).max(120),
  purpose: z.string().trim().min(3).max(500).optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const clinicianId = context.user.id as string;

    const body = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { patientTokenId, purpose } = parsed.data;

    const [patient, clinician] = await Promise.all([
      prisma.patient.findUnique({
        where: { tokenId: patientTokenId },
        select: { id: true, tokenId: true, firstName: true, lastName: true },
      }),
      prisma.user.findUnique({
        where: { id: clinicianId },
        select: { id: true, firstName: true, lastName: true, role: true },
      }),
    ]);

    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' }, { status: 404 });
    }

    const requestId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.notification.create({
      data: {
        recipientId: patient.id,
        recipientType: 'PATIENT',
        type: 'CONSENT_REQUIRED',
        title: 'Solicitud de acceso a tu perfil',
        message:
          `Un profesional de salud (${clinician?.firstName || 'Clinician'} ${clinician?.lastName || ''}`.trim() +
          `) solicita acceso a tu perfil. ` +
          (purpose ? `Motivo: ${purpose}` : 'Aprueba o rechaza esta solicitud.'),
        actionUrl: `/portal/dashboard/access-requests?requestId=${requestId}`,
        actionLabel: 'Revisar solicitud',
        resourceType: 'Patient',
        resourceId: patient.id,
        priority: 'HIGH',
        expiresAt,
        metadata: {
          kind: 'DATA_ACCESS_REQUEST',
          requestId,
          patientTokenId: patient.tokenId,
          clinicianId,
          clinicianName: clinician ? `${clinician.firstName} ${clinician.lastName}` : undefined,
          purpose: purpose || null,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: clinicianId,
        recipientType: 'CLINICIAN',
        type: 'SYSTEM_ALERT',
        title: 'Solicitud enviada',
        message: `Tu solicitud de acceso fue enviada al paciente ${patient.tokenId}.`,
        priority: 'NORMAL',
        expiresAt,
        metadata: {
          kind: 'DATA_ACCESS_REQUEST_SENT',
          requestId,
          patientTokenId: patient.tokenId,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    return NextResponse.json(
      { success: true, requestId, expiresAt: expiresAt.toISOString() },
      { status: 200 }
    );
  },
  {
    roles: ['ADMIN', 'PHYSICIAN', 'NURSE', 'CLINICIAN', 'STAFF'],
    rateLimit: { windowMs: 60 * 1000, maxRequests: 10 },
  }
);


