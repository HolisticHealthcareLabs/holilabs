/**
 * POST /api/billing/route-claim
 *
 * Primary billing intelligence endpoint. Given a SNOMED concept + country + insurer,
 * returns the full claim routing result: billing code, payer rate, prior auth, and
 * clinician network status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { getBillingRouter } from '@/lib/finance/billing-router';
import { RouteClaimSchema } from '@/lib/validation/billing-schemas';

export const dynamic = 'force-dynamic';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    const body = await request.json();

    let validated;
    try {
      validated = RouteClaimSchema.parse(body);
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

    // Auto-inject clinicianId from authenticated user when not specified
    const clinicianId = validated.clinicianId ?? context.user.id;

    const router = getBillingRouter(prisma);
    const result = await router.routeClaim({
      snomedConceptId: validated.snomedConceptId,
      country: validated.country,
      insurerId: validated.insurerId,
      clinicianId,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 120 },
    audit: { action: 'READ', resource: 'BillingRoute' },
  }
);
