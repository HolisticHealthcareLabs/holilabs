import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getPopulationDashboard } from '@/lib/vbc/population-health.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const periodStartStr = searchParams.get('periodStart');
      const periodEndStr = searchParams.get('periodEnd');

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId query parameter is required' },
          { status: 400 },
        );
      }

      const now = new Date();
      const periodStart = periodStartStr
        ? new Date(periodStartStr)
        : new Date(now.getFullYear(), 0, 1);
      const periodEnd = periodEndStr
        ? new Date(periodEndStr)
        : now;

      const dashboard = await getPopulationDashboard(
        prisma,
        organizationId,
        periodStart,
        periodEnd,
      );

      return NextResponse.json({ success: true, data: dashboard });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch population dashboard' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'PopulationDashboard' },
  },
);
