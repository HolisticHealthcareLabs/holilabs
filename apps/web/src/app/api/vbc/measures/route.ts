import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

const CreateMeasureSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['PROCESS', 'OUTCOME', 'PATIENT_REPORTED', 'COST', 'EFFICIENCY']),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']).default('QUARTERLY'),
  numeratorRule: z.record(z.unknown()),
  denominatorRule: z.record(z.unknown()),
  exclusionRule: z.record(z.unknown()).nullable().optional(),
  targetRate: z.number().min(0).max(1).nullable().optional(),
  benchmarkRate: z.number().min(0).max(1).nullable().optional(),
  sourceAuthority: z.string().min(1),
  citationUrl: z.string().url().optional(),
  effectiveDate: z.string().transform((s) => new Date(s)),
  jurisdiction: z.string().default('BR'),
});

export const POST = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const parsed = CreateMeasureSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const measure = await prisma.qualityMeasure.create({
        data: parsed.data,
      });

      return NextResponse.json({ success: true, data: measure }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to create quality measure' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'QualityMeasure' },
  },
);

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const category = searchParams.get('category');
      const jurisdiction = searchParams.get('jurisdiction');
      const isActive = searchParams.get('isActive');

      const measures = await prisma.qualityMeasure.findMany({
        where: {
          ...(category ? { category: category as any } : {}),
          ...(jurisdiction ? { jurisdiction } : {}),
          ...(isActive !== null ? { isActive: isActive !== 'false' } : {}),
        },
        orderBy: { code: 'asc' },
      });

      return NextResponse.json({ success: true, data: measures });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list quality measures' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'READ', resource: 'QualityMeasure' },
  },
);
