import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { evaluateAndPersist } from '@/lib/vbc/quality-engine.service';
import type { PatientFacts } from '@/lib/vbc/quality-engine.service';

export const dynamic = 'force-dynamic';

const EvaluateSchema = z.object({
  measureCode: z.string().min(1),
  organizationId: z.string().min(1),
  periodStart: z.string().transform((s) => new Date(s)),
  periodEnd: z.string().transform((s) => new Date(s)),
  population: z.array(z.object({
    patientId: z.string(),
    age: z.number(),
    sex: z.string(),
    diagnoses: z.array(z.string()),
    medications: z.array(z.string()),
    labResults: z.array(z.object({
      code: z.string(),
      value: z.number(),
      unit: z.string(),
      date: z.string(),
    })),
    encounters: z.array(z.object({
      type: z.string(),
      date: z.string(),
      providerId: z.string().optional(),
    })),
    vitals: z.array(z.object({
      type: z.string(),
      value: z.number(),
      unit: z.string(),
      date: z.string(),
    })),
  })).min(1),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = EvaluateSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { measureCode, organizationId, periodStart, periodEnd, population } = parsed.data;
      const userId = context.user?.id ?? 'system';

      const result = await evaluateAndPersist(
        prisma,
        measureCode,
        organizationId,
        periodStart,
        periodEnd,
        population as PatientFacts[],
        userId,
      );

      return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
      if ((error as Error).message?.includes('not found')) {
        return NextResponse.json({ error: (error as Error).message }, { status: 404 });
      }
      return safeErrorResponse(error, { userMessage: 'Failed to evaluate quality measure' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'CREATE', resource: 'QualityMeasureResult' },
  },
);
