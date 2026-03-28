import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getMeasureHistory } from '@/lib/vbc/quality-engine.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const code = context.params?.code;
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const limit = parseInt(searchParams.get('limit') ?? '12', 10);

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId query parameter is required' },
          { status: 400 },
        );
      }

      const results = await getMeasureHistory(prisma, code, organizationId, limit);

      return NextResponse.json({ success: true, data: results });
    } catch (error) {
      if ((error as Error).message?.includes('not found')) {
        return NextResponse.json({ error: (error as Error).message }, { status: 404 });
      }
      return safeErrorResponse(error, { userMessage: 'Failed to fetch measure results' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'QualityMeasureResult' },
  },
);
