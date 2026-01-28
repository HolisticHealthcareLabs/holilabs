/**
 * Outcome Ground Truth API - Single Resource
 *
 * GET /api/assurance/outcome/[id] - Get outcome details
 * PUT /api/assurance/outcome/[id] - Update outcome
 * DELETE /api/assurance/outcome/[id] - Delete outcome
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

const updateOutcomeSchema = z.object({
  outcomeType: z.enum(['READMISSION', 'COMPLICATION', 'GLOSA', 'SUCCESS', 'APPEAL_WON']).optional(),
  outcomeValue: z.record(z.unknown()).optional(),
  outcomeDate: z.string().datetime().optional(),
  glosaCode: z.string().max(20).optional(),
  glosaAmount: z.number().min(0).optional(),
  glosaRecovered: z.boolean().optional(),
  appealStrategy: z.string().max(2000).optional(),
  matchScore: z.number().min(0).max(1).optional(),
  matchMethod: z.enum(['EXACT', 'FUZZY', 'MANUAL']).optional(),
  insurerProtocol: z.string().max(100).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get single outcome
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

    const outcome = await prisma.outcomeGroundTruth.findUnique({
      where: { id },
      include: {
        assuranceEvent: {
          select: {
            id: true,
            eventType: true,
            clinicId: true,
            aiRecommendation: true,
            humanDecision: true,
            humanOverride: true,
            createdAt: true,
          },
        },
      },
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: outcome });
  } catch (error) {
    logger.error({
      event: 'outcome_api_error',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get outcome' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT: Update outcome
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
    const validation = updateOutcomeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const outcome = await prisma.outcomeGroundTruth.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.outcomeDate) {
      updateData.outcomeDate = new Date(validation.data.outcomeDate);
    }

    const updated = await prisma.outcomeGroundTruth.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'OutcomeGroundTruth',
        resourceId: id,
        details: { changes: Object.keys(validation.data) },
        success: true,
      },
      req
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({
      event: 'outcome_api_error',
      method: 'PUT',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update outcome' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE: Delete outcome
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

    const outcome = await prisma.outcomeGroundTruth.findUnique({
      where: { id },
      select: { id: true, assuranceEventId: true, outcomeType: true },
    });

    if (!outcome) {
      return NextResponse.json({ error: 'Outcome not found' }, { status: 404 });
    }

    await prisma.outcomeGroundTruth.delete({ where: { id } });

    await createAuditLog(
      {
        action: 'DELETE',
        resource: 'OutcomeGroundTruth',
        resourceId: id,
        details: {
          assuranceEventId: outcome.assuranceEventId,
          outcomeType: outcome.outcomeType,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'outcome_ground_truth_deleted',
      outcomeId: id,
      assuranceEventId: outcome.assuranceEventId,
    });

    return NextResponse.json({
      success: true,
      message: 'Outcome deleted',
    });
  } catch (error) {
    logger.error({
      event: 'outcome_api_error',
      method: 'DELETE',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete outcome' }, { status: 500 });
  }
}
