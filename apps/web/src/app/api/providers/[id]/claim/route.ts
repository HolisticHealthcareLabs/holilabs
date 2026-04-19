export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const claimSchema = z.object({
  licenseDocUrl: z.string().url('A valid license document URL is required'),
  contactPhone: z.string().min(5).max(30).optional(),
  /** Short note from the claimant to the reviewer */
  verificationNote: z.string().max(1000).optional(),
});

/**
 * GET /api/providers/[id]/claim — current claim status for the authenticated user
 */
export const GET = createProtectedRoute(async (_request, context) => {
  try {
    const id = context.params?.id;
    const userId = context.user?.id;
    if (!id || !userId) {
      return NextResponse.json({ error: 'Missing provider id or user' }, { status: 400 });
    }

    const provider = await prisma.physicianCatalog.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        claimStatus: true,
        claimedByUserId: true,
        claimedAt: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        providerId: provider.id,
        providerName: provider.name,
        claimStatus: provider.claimStatus,
        claimedByCurrentUser: provider.claimedByUserId === userId,
        claimedAt: provider.claimedAt,
      },
    });
  } catch (error) {
    return safeErrorResponse(error);
  }
});

/**
 * POST /api/providers/[id]/claim — submit a claim request (authenticated).
 *
 * Rules:
 * - Provider must exist and be UNCLAIMED. Re-claims of PENDING/VERIFIED are rejected.
 * - Authenticated user cannot already have another claimed profile.
 * - Sets claimStatus=PENDING_VERIFICATION; admin review completes transition to VERIFIED.
 */
export const POST = createProtectedRoute(
  async (request, context) => {
    try {
      const id = context.params?.id;
      const userId = context.user?.id;
      if (!id || !userId) {
        return NextResponse.json({ error: 'Missing provider id or user' }, { status: 400 });
      }

      const body = await request.json();
      const parsed = claimSchema.parse(body);

      const provider = await prisma.physicianCatalog.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          claimStatus: true,
          claimedByUserId: true,
          isRegistryActive: true,
        },
      });

      if (!provider) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      if (!provider.isRegistryActive) {
        return NextResponse.json(
          { error: 'This provider is not currently listed in the registry and cannot be claimed.' },
          { status: 400 },
        );
      }

      if (provider.claimStatus === 'VERIFIED') {
        return NextResponse.json(
          { error: 'This profile has already been claimed and verified.' },
          { status: 409 },
        );
      }

      if (provider.claimStatus === 'PENDING_VERIFICATION' && provider.claimedByUserId !== userId) {
        return NextResponse.json(
          { error: 'This profile has a pending claim from another user. Contact support if this is your profile.' },
          { status: 409 },
        );
      }

      if (provider.claimStatus === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'This profile is suspended and cannot be claimed. Contact support.' },
          { status: 409 },
        );
      }

      const existingClaim = await prisma.physicianCatalog.findFirst({
        where: {
          claimedByUserId: userId,
          id: { not: id },
        },
        select: { id: true, name: true },
      });

      if (existingClaim) {
        return NextResponse.json(
          {
            error: 'Your account is already linked to another provider profile.',
            detail: `Existing claim: ${existingClaim.name}`,
          },
          { status: 409 },
        );
      }

      const updated = await prisma.physicianCatalog.update({
        where: { id },
        data: {
          claimedByUserId: userId,
          claimStatus: 'PENDING_VERIFICATION',
          claimedAt: new Date(),
          licenseDocUrl: parsed.licenseDocUrl,
          ...(parsed.contactPhone ? { phone: parsed.contactPhone } : {}),
        },
        select: {
          id: true,
          name: true,
          claimStatus: true,
          claimedAt: true,
        },
      });

      return NextResponse.json({
        data: {
          providerId: updated.id,
          providerName: updated.name,
          claimStatus: updated.claimStatus,
          claimedAt: updated.claimedAt,
          verificationNote: parsed.verificationNote ?? null,
        },
        message: 'Claim submitted. Our team will verify your license document within 2 business days.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 5, windowMs: 3600_000 },
    audit: { action: 'provider_claim_submit', resource: 'PhysicianCatalog' },
    skipCsrf: true, // no browser form origin — called from our own SPA over fetch
  },
);
