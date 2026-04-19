export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';
import type { UserRole } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/admin/claims/[id]/approve — mark a pending claim as VERIFIED
 *
 * Only claims currently in PENDING_VERIFICATION can be approved. The action
 * is recorded in the hash-chained audit log so the approval trail survives
 * future disputes.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      const adminId = context.user?.id;
      if (!id || !adminId) {
        return NextResponse.json({ error: 'Missing claim id or admin user' }, { status: 400 });
      }

      const body = await request.json().catch(() => ({}));
      const { note } = bodySchema.parse(body);

      const claim = await prisma.physicianCatalog.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          claimStatus: true,
          claimedByUserId: true,
          licenseDocUrl: true,
        },
      });

      if (!claim) {
        return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
      }

      if (claim.claimStatus !== 'PENDING_VERIFICATION') {
        return NextResponse.json(
          { error: `Cannot approve — current status is ${claim.claimStatus}` },
          { status: 409 },
        );
      }

      if (!claim.claimedByUserId) {
        return NextResponse.json(
          { error: 'Claim has no associated user — cannot verify' },
          { status: 400 },
        );
      }

      const updated = await prisma.physicianCatalog.update({
        where: { id },
        data: {
          claimStatus: 'VERIFIED',
        },
        select: {
          id: true,
          name: true,
          claimStatus: true,
          claimedByUserId: true,
        },
      });

      await createAuditLog(
        {
          action: 'UPDATE',
          resource: 'PhysicianCatalog',
          resourceId: id,
          details: {
            event: 'claim_approved',
            physicianName: claim.name,
            claimantUserId: claim.claimedByUserId,
            adminNote: note ?? null,
            previousStatus: 'PENDING_VERIFICATION',
            newStatus: 'VERIFIED',
          },
          success: true,
        },
        request,
        adminId,
      );

      return NextResponse.json({
        data: updated,
        message: 'Claim approved and profile verified.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    roles: ['ADMIN', 'LICENSE_OWNER'] as UserRole[],
    audit: { action: 'admin_claim_approve', resource: 'PhysicianCatalog' },
    skipCsrf: true,
  },
);
