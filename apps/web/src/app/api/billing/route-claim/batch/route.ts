/**
 * POST /api/billing/route-claim/batch
 *
 * Batch claim routing for multi-procedure encounters. Accepts up to 20 SNOMED
 * concepts and routes them all for one insurer, returning individual results
 * plus an aggregate summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { getBillingRouter } from '@/lib/finance/billing-router';
import { BatchRouteClaimSchema } from '@/lib/validation/billing-schemas';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();

    let validated;
    try {
      validated = BatchRouteClaimSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
      }
      throw error;
    }

    const clinicianId = validated.clinicianId ?? context.user.id;
    const router = getBillingRouter(prisma);

    // Route all procedures concurrently
    const results = await Promise.all(
      validated.procedures.map((proc) =>
        router.routeClaim({
          snomedConceptId: proc.snomedConceptId,
          country: validated.country,
          insurerId: validated.insurerId,
          clinicianId,
        })
      )
    );

    // Build aggregate summary
    const resolved = results.filter((r) => r.billingCode !== null);
    const totalRate = resolved.reduce(
      (sum, r) => sum + (r.rate?.negotiatedRate ?? 0),
      0
    );
    const currency = resolved[0]?.rate?.currency ?? null;
    const avgConfidence =
      results.length > 0
        ? Math.round(
            (results.reduce((sum, r) => sum + r.routingConfidence, 0) /
              results.length) *
              100
          ) / 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          totalProcedures: results.length,
          resolvedCount: resolved.length,
          unresolvedCount: results.length - resolved.length,
          totalEstimatedRate: Math.round(totalRate * 100) / 100,
          currency,
          averageConfidence: avgConfidence,
          anyPriorAuthRequired: results.some((r) => r.priorAuth.required),
        },
      },
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 30 },
    audit: { action: 'READ', resource: 'BillingRoute' },
  }
);
