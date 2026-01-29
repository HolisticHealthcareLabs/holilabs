/**
 * Feature Flags API - Collection
 *
 * GET /api/feature-flags - List all feature flags
 * POST /api/feature-flags - Create new feature flag
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

const createFlagSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_.-]+$/i, 'Flag name must be alphanumeric with dots, underscores, or hyphens'),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(false),
  clinicId: z.string().optional(),
  reason: z.string().optional(),
});

const listFlagsSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET: List feature flags
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const validation = listFlagsSchema.safeParse(searchParams);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { enabled, search, limit, offset } = validation.data;

    const where: Record<string, unknown> = {};
    if (enabled !== undefined) where.enabled = enabled;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [flags, total] = await Promise.all([
      prisma.featureFlag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.featureFlag.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: flags,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + flags.length < total,
      },
    });
  } catch (error) {
    logger.error({
      event: 'feature_flags_api_error',
      method: 'GET',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to list feature flags' }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST: Create feature flag
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createFlagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Check for duplicate flag name within scope
    const existing = await prisma.featureFlag.findFirst({
      where: {
        name: validation.data.name,
        clinicId: validation.data.clinicId ?? null,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Feature flag with this name already exists in this scope' },
        { status: 409 }
      );
    }

    const flag = await prisma.featureFlag.create({
      data: validation.data,
    });

    await createAuditLog(
      {
        action: 'CREATE',
        resource: 'FeatureFlag',
        resourceId: flag.id,
        details: {
          name: flag.name,
          enabled: flag.enabled,
        },
        success: true,
      },
      req
    );

    logger.info({
      event: 'feature_flag_created',
      flagId: flag.id,
      name: flag.name,
    });

    return NextResponse.json(
      { success: true, data: flag },
      { status: 201 }
    );
  } catch (error) {
    logger.error({
      event: 'feature_flags_api_error',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 });
  }
}
