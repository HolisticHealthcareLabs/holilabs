import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { approveAgreement } from '@/lib/care-coordination/cross-org.service';

export const dynamic = 'force-dynamic';

export const PATCH = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const agreementId = context.params?.id;
      if (!agreementId) {
        return NextResponse.json({ error: 'Missing agreement ID' }, { status: 400 });
      }

      const existing = await prisma.dataSharingAgreement.findUnique({
        where: { id: agreementId },
        select: { id: true, receivingOrgId: true, status: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }

      // AWAITING_REVIEW: only the receiving org's admin should approve
      if (existing.receivingOrgId !== context.user.organizationId) {
        return NextResponse.json(
          { error: 'Only the receiving organization can approve this agreement' },
          { status: 403 },
        );
      }

      const agreement = await approveAgreement(prisma, agreementId, context.user.id);

      return NextResponse.json({ data: agreement });
    } catch (error) {
      if (error instanceof Error && error.message.includes('cannot be approved')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return safeErrorResponse(error, { userMessage: 'Failed to approve agreement' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'DataSharingAgreement' },
  },
);
