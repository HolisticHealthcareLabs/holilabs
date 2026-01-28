/**
 * Human Feedback API - Single Resource
 *
 * GET /api/assurance/feedback/[id] - Get feedback details
 * PUT /api/assurance/feedback/[id] - Update feedback
 * DELETE /api/assurance/feedback/[id] - Delete feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth/auth';
import { verifyInternalAgentToken } from '@/lib/hash';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function authenticateRequest(
  req: NextRequest
): Promise<{ userId: string } | null> {
  const internalToken = req.headers.get('X-Agent-Internal-Token');

  if (internalToken && verifyInternalAgentToken(internalToken)) {
    const userEmail = req.headers.get('X-Agent-User-Email');
    const headerUserId = req.headers.get('X-Agent-User-Id');

    if (userEmail) {
      const dbUser = await prisma.user.findFirst({
        where: { OR: [{ id: headerUserId || '' }, { email: userEmail }] },
        select: { id: true },
      });
      if (dbUser) return { userId: dbUser.id };
    }
  }

  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) return null;
  return { userId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

const updateFeedbackSchema = z.object({
  feedbackType: z.enum(['THUMBS_UP', 'THUMBS_DOWN', 'CORRECTION', 'COMMENT']).optional(),
  feedbackValue: z.record(z.unknown()).optional(),
  feedbackSource: z.enum(['PHYSICIAN', 'NURSE', 'PHARMACIST', 'ADMIN', 'BILLING']).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get single feedback
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feedback = await prisma.humanFeedback.findUnique({
      where: { id },
      include: {
        assuranceEvent: {
          select: {
            id: true,
            eventType: true,
            clinicId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: feedback });
  } catch (error) {
    logger.error({
      event: 'feedback_api_error',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT: Update feedback
// ═══════════════════════════════════════════════════════════════════════════════

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = updateFeedbackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const feedback = await prisma.humanFeedback.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const updated = await prisma.humanFeedback.update({
      where: { id },
      data: validation.data,
    });

    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'HumanFeedback',
        resourceId: id,
        details: { changes: Object.keys(validation.data) },
        success: true,
      },
      req
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({
      event: 'feedback_api_error',
      method: 'PUT',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE: Delete feedback
// ═══════════════════════════════════════════════════════════════════════════════

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const feedback = await prisma.humanFeedback.findUnique({
      where: { id },
      select: { id: true, assuranceEventId: true },
    });

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    await prisma.humanFeedback.delete({ where: { id } });

    await createAuditLog(
      {
        action: 'DELETE',
        resource: 'HumanFeedback',
        resourceId: id,
        details: { assuranceEventId: feedback.assuranceEventId },
        success: true,
      },
      req
    );

    logger.info({
      event: 'human_feedback_deleted',
      feedbackId: id,
      assuranceEventId: feedback.assuranceEventId,
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted',
    });
  } catch (error) {
    logger.error({
      event: 'feedback_api_error',
      method: 'DELETE',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
