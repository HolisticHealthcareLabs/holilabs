export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { createProtectedRoute } from '@/lib/api/middleware';
import { z } from 'zod';

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(1).max(2000).optional(),
});

/**
 * GET /api/providers/[id]/reviews — returns the authenticated user's own review
 * for this physician (if any). Used by the detail page to decide whether to
 * show the submit form or an edit/view state.
 */
export const GET = createProtectedRoute(async (_request, context) => {
  try {
    const id = context.params?.id;
    const userId = context.user?.id;
    if (!id || !userId) {
      return NextResponse.json({ error: 'Missing provider id or user' }, { status: 400 });
    }

    const review = await prisma.physicianReview.findUnique({
      where: { physicianId_authorUserId: { physicianId: id, authorUserId: userId } },
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: review });
  } catch (error) {
    return safeErrorResponse(error);
  }
});

/**
 * POST /api/providers/[id]/reviews — submit a new review.
 *
 * Reviews enter the moderation queue (status=PENDING) and are not visible in
 * public listings until an admin sets status=APPROVED. One review per user
 * per physician (enforced by unique constraint in Prisma).
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
      const parsed = reviewSchema.parse(body);

      if (!parsed.title && !parsed.body) {
        return NextResponse.json(
          { error: 'Please include either a title or a written review.' },
          { status: 400 },
        );
      }

      const provider = await prisma.physicianCatalog.findUnique({
        where: { id },
        select: {
          id: true,
          publicProfileEnabled: true,
          isRegistryActive: true,
          claimedByUserId: true,
        },
      });

      if (!provider || !provider.publicProfileEnabled || !provider.isRegistryActive) {
        return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
      }

      if (provider.claimedByUserId === userId) {
        return NextResponse.json(
          { error: 'You cannot review your own profile.' },
          { status: 403 },
        );
      }

      const existing = await prisma.physicianReview.findUnique({
        where: { physicianId_authorUserId: { physicianId: id, authorUserId: userId } },
        select: { id: true, status: true },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: 'You have already submitted a review for this physician.',
            detail: `Current status: ${existing.status}`,
          },
          { status: 409 },
        );
      }

      const review = await prisma.physicianReview.create({
        data: {
          physicianId: id,
          authorUserId: userId,
          rating: parsed.rating,
          title: parsed.title ?? null,
          body: parsed.body ?? null,
          status: 'PENDING',
        },
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          status: true,
          createdAt: true,
        },
      });

      return NextResponse.json({
        data: review,
        message: 'Thank you — your review has been submitted for moderation and will be published once approved.',
      });
    } catch (error) {
      return safeErrorResponse(error);
    }
  },
  {
    rateLimit: { maxRequests: 5, windowMs: 3600_000 },
    audit: { action: 'review_submit', resource: 'PhysicianReview' },
    skipCsrf: true,
  },
);
