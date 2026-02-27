/**
 * GET /api/billing/insurers
 *
 * Returns active insurers for UI dropdowns, optionally filtered by country.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { prisma } from '@/lib/prisma';
import { InsurersQuerySchema } from '@/lib/validation/billing-schemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    let validated;
    try {
      validated = InsurersQuerySchema.parse(query);
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

    const where: any = { isActive: true };
    if (validated.country) {
      where.country = validated.country;
    }

    const insurers = await prisma.insurer.findMany({
      where,
      select: {
        id: true,
        name: true,
        shortName: true,
        country: true,
        insurerType: true,
        ansCode: true,
        rnos: true,
        cnsCode: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: insurers,
    });
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    audit: { action: 'READ', resource: 'Insurer' },
    skipCsrf: true,
  }
);
