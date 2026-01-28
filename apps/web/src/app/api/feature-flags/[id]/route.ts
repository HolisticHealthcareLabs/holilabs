/**
 * Feature Flag API - Single Resource
 *
 * Full CRUD for feature flags used in clinical/AI feature toggling.
 *
 * GET /api/feature-flags/[id] - Get flag details
 * PUT /api/feature-flags/[id] - Update flag
 * DELETE /api/feature-flags/[id] - Delete flag
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

const updateFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
  clinicOverrides: z.record(z.boolean()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET: Get single flag
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

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: flag });
  } catch (error) {
    logger.error({
      event: 'feature_flag_api_error',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to get feature flag' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT: Update flag
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
    const validation = updateFlagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
      select: { id: true, flagKey: true, enabled: true },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    const updated = await prisma.featureFlag.update({
      where: { id },
      data: validation.data,
    });

    await createAuditLog(
      {
        action: 'UPDATE',
        resource: 'FeatureFlag',
        resourceId: id,
        details: {
          flagKey: flag.flagKey,
          changes: Object.keys(validation.data),
          previousEnabled: flag.enabled,
          newEnabled: validation.data.enabled,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'feature_flag_updated',
      flagId: id,
      flagKey: flag.flagKey,
      changes: Object.keys(validation.data),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error({
      event: 'feature_flag_api_error',
      method: 'PUT',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE: Delete flag
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

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
      select: { id: true, flagKey: true },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    await prisma.featureFlag.delete({ where: { id } });

    await createAuditLog(
      {
        action: 'DELETE',
        resource: 'FeatureFlag',
        resourceId: id,
        details: { flagKey: flag.flagKey },
        success: true,
      },
      req
    );

    logger.info({
      event: 'feature_flag_deleted',
      flagId: id,
      flagKey: flag.flagKey,
    });

    return NextResponse.json({
      success: true,
      message: 'Feature flag deleted',
    });
  } catch (error) {
    logger.error({
      event: 'feature_flag_api_error',
      method: 'DELETE',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to delete feature flag' }, { status: 500 });
  }
}
