/**
 * Approve an access request (patient)
 *
 * POST /api/portal/access-requests/:requestId/approve
 *
 * v1 behavior:
 * - Grants access by assigning the requesting clinician as the patient's assigned clinician.
 * - Marks the notification as read.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';

export const dynamic = 'force-dynamic';

export const POST = createPatientPortalRoute(
  async (_request: NextRequest, context: PatientPortalContext) => {
    const requestId = context.params.requestId;

    const notif = await prisma.notification.findFirst({
      where: {
        recipientId: context.session.patientId,
        recipientType: 'PATIENT',
        type: 'CONSENT_REQUIRED',
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const meta = (notif?.metadata as any) || {};
    if (!notif || meta.kind !== 'DATA_ACCESS_REQUEST' || meta.requestId !== requestId) {
      return NextResponse.json(
        { success: false, error: 'Access request not found' },
        { status: 404 }
      );
    }

    if (notif.expiresAt && notif.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Access request expired' },
        { status: 410 }
      );
    }

    const clinicianId = meta.clinicianId as string | undefined;
    if (!clinicianId) {
      return NextResponse.json(
        { success: false, error: 'Invalid access request (missing clinician)' },
        { status: 400 }
      );
    }

    // Grant access by assigning clinician
    await prisma.patient.update({
      where: { id: context.session.patientId },
      data: { assignedClinicianId: clinicianId },
    });

    await prisma.notification.update({
      where: { id: notif.id },
      data: { isRead: true, readAt: new Date() },
    });

    await prisma.notification.create({
      data: {
        recipientId: clinicianId,
        recipientType: 'CLINICIAN',
        type: 'SYSTEM_ALERT',
        title: 'Acceso aprobado',
        message: `El paciente aprobó tu solicitud de acceso.`,
        actionUrl: `/dashboard/patients`,
        actionLabel: 'Ver pacientes',
        priority: 'HIGH',
        metadata: { kind: 'DATA_ACCESS_APPROVED', requestId, patientId: context.session.patientId },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'UPDATE', resource: 'AccessRequest' },
  }
);
