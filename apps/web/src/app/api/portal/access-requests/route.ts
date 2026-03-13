/**
 * Patient Access Requests (Approval)
 *
 * GET /api/portal/access-requests
 * - List pending access request notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';

export const dynamic = 'force-dynamic';

export const GET = createPatientPortalRoute(
  async (_request: NextRequest, context: PatientPortalContext) => {
    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: context.session.patientId,
        recipientType: 'PATIENT',
        type: 'CONSENT_REQUIRED',
        isRead: false,
        expiresAt: { gt: new Date() },
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
  },
  {
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'AccessRequests' },
  }
);
