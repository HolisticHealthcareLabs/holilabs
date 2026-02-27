/**
 * GET /api/billing/crosswalk
 *
 * Lightweight SNOMED-to-billing-code crosswalk lookup for autocomplete/typeahead.
 * Returns just the crosswalk result (no rate or prior auth info).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { getBillingRouter } from '@/lib/finance/billing-router';
import { CrosswalkQuerySchema } from '@/lib/validation/billing-schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    let validated;
    try {
      validated = CrosswalkQuerySchema.parse(query);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Query validation failed',
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

    const router = getBillingRouter(prisma);
    const result = await router.crosswalkCode(
      validated.snomedConceptId,
      validated.country
    );

    if (!result) {
      return NextResponse.json(
        {
          error: 'Crosswalk not found',
          message: `No billing code mapping found for SNOMED ${validated.snomedConceptId} in ${validated.country}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 120 },
    audit: { action: 'READ', resource: 'SnomedCrosswalk' },
    skipCsrf: true,
  }
);
