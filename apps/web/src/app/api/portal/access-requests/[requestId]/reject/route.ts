/**
 * Reject an access request (patient)
 *
 * POST /api/portal/access-requests/:requestId/reject
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePatientSession } from '@/lib/auth/patient-session';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await requirePatientSession();
  const requestId = params.requestId;

  const notif = await prisma.notification.findFirst({
    where: {
      recipientId: session.patientId,
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

  const clinicianId = meta.clinicianId as string | undefined;

  await prisma.notification.update({
    where: { id: notif.id },
    data: { isRead: true, readAt: new Date() },
  });

  if (clinicianId) {
    await prisma.notification.create({
      data: {
        recipientId: clinicianId,
        recipientType: 'CLINICIAN',
        type: 'SYSTEM_ALERT',
        title: 'Acceso rechazado',
        message: `El paciente rechazó tu solicitud de acceso.`,
        priority: 'NORMAL',
        metadata: { kind: 'DATA_ACCESS_REJECTED', requestId, patientId: session.patientId },
      },
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}


