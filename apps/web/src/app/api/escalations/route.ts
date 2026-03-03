/**
 * Escalation List API
 *
 * GET /api/escalations
 * Returns escalations with filtering by status, pagination, and counts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import type { EscalationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

const VALID_STATUSES: EscalationStatus[] = ['OPEN', 'BREACHED', 'RESOLVED'];

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as EscalationStatus | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status && VALID_STATUSES.includes(status)
      ? { status }
      : {};

    const [escalations, total, counts] = await Promise.all([
      prisma.escalation.findMany({
        where,
        orderBy: [{ status: 'asc' }, { slaDeadline: 'asc' }],
        take: limit,
        skip: offset,
        include: {
          scheduledReminder: { select: { templateName: true, channel: true } },
          patient: { select: { id: true, firstName: true, lastName: true } },
          resolvedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.escalation.count({ where }),
      Promise.all([
        prisma.escalation.count({ where: { status: 'OPEN' } }),
        prisma.escalation.count({ where: { status: 'BREACHED' } }),
        prisma.escalation.count({ where: { status: 'RESOLVED' } }),
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: escalations,
      counts: { open: counts[0], breached: counts[1], resolved: counts[2] },
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    });
  },
  { skipCsrf: true },
);
