import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const agreementId = context.params?.id;
      if (!agreementId) {
        return NextResponse.json({ error: 'Missing agreement ID' }, { status: 400 });
      }

      const agreement = await prisma.dataSharingAgreement.findUnique({
        where: { id: agreementId },
        include: {
          patientConsents: {
            select: {
              id: true,
              patientId: true,
              consentedScopes: true,
              deniedScopes: true,
              grantedAt: true,
              revokedAt: true,
              consentVersion: true,
            },
          },
          _count: { select: { sharedRecords: true } },
        },
      });

      if (!agreement) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }

      const orgId = context.user.organizationId;
      if (
        agreement.requestingOrgId !== orgId &&
        agreement.receivingOrgId !== orgId
      ) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      return NextResponse.json({ data: agreement });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch agreement' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'DataSharingAgreement' },
  },
);
