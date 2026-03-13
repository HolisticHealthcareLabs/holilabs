/**
 * Feature Flag API - Single Resource
 *
 * GET /api/feature-flags/[id] - Get flag details
 * PUT /api/feature-flags/[id] - Update flag
 * DELETE /api/feature-flags/[id] - Delete flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import logger from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const updateFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  defaultValue: z.boolean().optional(),
  clinicOverrides: z.record(z.boolean()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const GET = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const { id } = params;

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
    });

    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: flag });
  },
  {
    roles: ['ADMIN'],
    skipCsrf: true,
    audit: { action: 'READ', resource: 'FeatureFlag' },
  }
);

export const PUT = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const { id } = params;

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
      select: { id: true, name: true, enabled: true },
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
          name: flag.name,
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
      name: flag.name,
      changes: Object.keys(validation.data),
    });

    return NextResponse.json({ success: true, data: updated });
  },
  {
    roles: ['ADMIN'],
    audit: { action: 'UPDATE', resource: 'FeatureFlag' },
  }
);

export const DELETE = createProtectedRoute(
  async (req: NextRequest, context: any) => {
    const params = await Promise.resolve(context.params ?? ({} as any));
    const { id } = params;

    const flag = await prisma.featureFlag.findUnique({
      where: { id },
      select: { id: true, name: true },
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
        details: { name: flag.name },
        success: true,
      },
      req
    );

    logger.info({
      event: 'feature_flag_deleted',
      flagId: id,
      name: flag.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Feature flag deleted',
    });
  },
  {
    roles: ['ADMIN'],
    audit: { action: 'DELETE', resource: 'FeatureFlag' },
  }
);
