/**
 * Feature Flags API - Collection
 *
 * GET /api/feature-flags - List all feature flags
 * POST /api/feature-flags - Create new feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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

export const GET = createProtectedRoute(
  async (req: NextRequest) => {
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
  },
  {
    roles: ['ADMIN'],
    skipCsrf: true,
  }
);

export const POST = createProtectedRoute(
  async (req: NextRequest) => {
    const body = await req.json();
    const validation = createFlagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.errors },
        { status: 400 }
      );
    }

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
  },
  {
    roles: ['ADMIN'],
  }
);
