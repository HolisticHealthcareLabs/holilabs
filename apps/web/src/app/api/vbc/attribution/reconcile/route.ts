import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { reconcileAttributions } from '@/lib/vbc/attribution.service';

export const dynamic = 'force-dynamic';

const ReconcileSchema = z.object({
  organizationId: z.string().min(1),
  lookbackMonths: z.number().int().min(1).max(36).default(12),
  minVisits: z.number().int().min(1).max(20).default(2),
});

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = ReconcileSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { organizationId, lookbackMonths, minVisits } = parsed.data;

      const result = await reconcileAttributions(
        prisma,
        organizationId,
        lookbackMonths,
        minVisits,
      );

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to reconcile attributions' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'PatientAttribution.Reconciliation' },
  },
);
