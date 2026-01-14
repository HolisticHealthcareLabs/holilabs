/**
 * Patient Access Requests (Approval)
 *
 * GET /api/portal/access-requests
 * - List pending access request notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePatientSession } from '@/lib/auth/patient-session';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const session = await requirePatientSession();

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: session.patientId,
      recipientType: 'PATIENT',
      type: 'CONSENT_REQUIRED',
      isRead: false,
      expiresAt: { gt: new Date() },
      // metadata.kind = 'DATA_ACCESS_REQUEST' (can't filter JSON consistently across DBs here)
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const accessRequests = notifications
    .filter((n) => (n.metadata as any)?.kind === 'DATA_ACCESS_REQUEST')
    .map((n) => ({
      notificationId: n.id,
      requestId: (n.metadata as any)?.requestId,
      clinicianId: (n.metadata as any)?.clinicianId,
      clinicianName: (n.metadata as any)?.clinicianName,
      purpose: (n.metadata as any)?.purpose,
      expiresAt: n.expiresAt,
      createdAt: n.createdAt,
    }));

  return NextResponse.json({ success: true, data: { accessRequests } }, { status: 200 });
}


