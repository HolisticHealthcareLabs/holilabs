export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import type { UserRole } from '@prisma/client';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'VERIFIED', 'UNCLAIMED', 'SUSPENDED', 'ALL']).default('PENDING_VERIFICATION'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * GET /api/admin/claims — list physician profile claims (admin/license-owner only)
 *
 * Default returns claims awaiting verification. Pass ?status=ALL for full history.
 */
export const GET = createProtectedRoute(
  async (request) => {
    try {
      const url = new URL(request.url);
      const { status, limit } = querySchema.parse(Object.fromEntries(url.searchParams));

      const where = status === 'ALL' ? {} : { claimStatus: status };

      const claims = await prisma.physicianCatalog.findMany({
        where: {
          ...where,
          ...(status === 'PENDING_VERIFICATION' ? {} : { claimedByUserId: { not: null } }),
        },
        select: {
          id: true,
          name: true,
          country: true,
          registryId: true,
          registryState: true,
          registrySource: true,
          claimStatus: true,
          claimedByUserId: true,
          claimedAt: true,
          licenseDocUrl: true,
          addressCity: true,
          addressState: true,
          phone: true,
          email: true,
          publicProfileEnabled: true,
          isRegistryActive: true,
          claimedByUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              createdAt: true,
            },
          },
        },
        orderBy: { claimedAt: 'desc' },
        take: limit,
      });

      return NextResponse.json({
        data: claims.map((c) => ({
          id: c.id,
          physicianName: c.name,
          country: c.country,
          registryId: c.registryId,
          registryState: c.registryState,
          registrySource: c.registrySource,
          claimStatus: c.claimStatus,
          claimedAt: c.claimedAt,
          licenseDocUrl: c.licenseDocUrl,
          city: c.addressCity,
          state: c.addressState,
          contactPhone: c.phone,
          contactEmail: c.email,
          publicProfileEnabled: c.publicProfileEnabled,
          isRegistryActive: c.isRegistryActive,
          claimant: c.claimedByUser,
        })),
        pagination: { total: claims.length, limit },
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    roles: ['ADMIN', 'LICENSE_OWNER'] as UserRole[],
    audit: { action: 'admin_claims_list', resource: 'PhysicianCatalog' },
  },
);
