export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { createAuditLog } from '@/lib/audit';
import type { UserRole } from '@prisma/client';
import { z } from 'zod';

const bodySchema = z.object({
  reason: z.string().min(5, 'A rejection reason is required').max(1000),
});

/**
 * POST /api/admin/claims/[id]/reject — reject a pending claim
 *
 * Moves the profile back to UNCLAIMED, clears the claimant association and
 * license document, and records the rejection reason in the hash-chained
 * audit log for LGPD compliance.
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
      const { reason } = bodySchema.parse(body);

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
          { error: `Cannot reject — current status is ${claim.claimStatus}` },
          { status: 409 },
        );
      }

      const updated = await prisma.physicianCatalog.update({
        where: { id },
        data: {
          claimStatus: 'UNCLAIMED',
          claimedByUserId: null,
          claimedAt: null,
          licenseDocUrl: null,
        },
        select: {
          id: true,
          name: true,
          claimStatus: true,
        },
      });

      await createAuditLog(
        {
          action: 'UPDATE',
          resource: 'PhysicianCatalog',
          resourceId: id,
          details: {
            event: 'claim_rejected',
            physicianName: claim.name,
            previousClaimantUserId: claim.claimedByUserId,
            previousLicenseDocUrl: claim.licenseDocUrl,
            rejectionReason: reason,
            previousStatus: 'PENDING_VERIFICATION',
            newStatus: 'UNCLAIMED',
          },
          success: true,
        },
        request,
        adminId,
      );

      return NextResponse.json({
        data: updated,
        message: 'Claim rejected. Profile is available to be claimed again.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    roles: ['ADMIN', 'LICENSE_OWNER'] as UserRole[],
    audit: { action: 'admin_claim_reject', resource: 'PhysicianCatalog' },
    skipCsrf: true,
  },
);
