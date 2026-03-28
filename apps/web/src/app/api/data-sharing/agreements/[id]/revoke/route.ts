import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { revokeAgreement } from '@/lib/care-coordination/cross-org.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RevokeSchema = z.object({
  reason: z.string().min(1).max(2000),
});

export const PATCH = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const agreementId = context.params?.id;
      if (!agreementId) {
        return NextResponse.json({ error: 'Missing agreement ID' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = RevokeSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const existing = await prisma.dataSharingAgreement.findUnique({
        where: { id: agreementId },
        select: { id: true, requestingOrgId: true, receivingOrgId: true },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
      }

      const orgId = context.user.organizationId;
      if (
        existing.requestingOrgId !== orgId &&
        existing.receivingOrgId !== orgId
      ) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const agreement = await revokeAgreement(
        prisma,
        agreementId,
        context.user.id,
        parsed.data.reason,
      );

      return NextResponse.json({ data: agreement });
    } catch (error) {
      if (error instanceof Error && error.message.includes('already revoked')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return safeErrorResponse(error, { userMessage: 'Failed to revoke agreement' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'UPDATE', resource: 'DataSharingAgreement' },
  },
);
