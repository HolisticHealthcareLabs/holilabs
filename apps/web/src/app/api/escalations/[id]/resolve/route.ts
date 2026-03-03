/**
 * Resolve Escalation API
 *
 * POST /api/escalations/[id]/resolve
 * Marks an escalation as RESOLVED with optional resolution notes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { resolveEscalation } from '@/lib/escalations/escalation-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ResolveSchema = z.object({
  resolution: z.string().max(2000).optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context) => {
    const url = new URL(request.url);
    // Extract escalation ID from the URL path: /api/escalations/[id]/resolve
    const segments = url.pathname.split('/');
    const resolveIdx = segments.indexOf('resolve');
    const escalationId = resolveIdx > 0 ? segments[resolveIdx - 1] : null;

    if (!escalationId) {
      return NextResponse.json({ success: false, error: 'Escalation ID required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = ResolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    const userId = context.user?.id;
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
    }

    try {
      const escalation = await resolveEscalation({
        escalationId,
        resolvedBy: userId,
        resolution: parsed.data.resolution,
      });

      return NextResponse.json({ success: true, data: escalation });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve escalation';
      const status = message === 'Escalation not found' ? 404 : 500;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  },
);
