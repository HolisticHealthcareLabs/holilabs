import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

const NearMissSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  location: z.string().optional(),
  involvedSystems: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  isAnonymous: z.boolean().optional(),
});

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const body = await request.json();
      const parsed = NearMissSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten() },
          { status: 422 },
        );
      }

      const data = parsed.data;
      const isAnonymous = data.isAnonymous ?? false;

      const incident = await prisma.safetyIncident.create({
        data: {
          ...(!isAnonymous && context.user?.id ? { reportedById: context.user.id } : {}),
          isAnonymous,
          eventType: 'NEAR_MISS',
          severity: 'LOW',
          title: data.title,
          description: data.description,
          location: data.location,
          involvedSystems: data.involvedSystems ?? [],
          tags: data.tags ?? [],
          dateOccurred: new Date(),
          requiresFullRCA: false,
        },
      });

      return NextResponse.json({ data: incident }, { status: 201 });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to report near-miss' });
    }
  },
  {
    audit: { action: 'CREATE', resource: 'SafetyIncident.NearMiss' },
  },
);
