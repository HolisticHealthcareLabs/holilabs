import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import {
  analyzeTrendsByField,
  analyzeTrendsByBone,
  analyzeTrendsByMonth,
  detectRecurringPatterns,
} from '@/lib/rca/trend-analyzer';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const dateFromParam = searchParams.get('dateFrom');
      const dateToParam = searchParams.get('dateTo');
      const monthsParam = searchParams.get('months');

      const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
      const dateTo = dateToParam ? new Date(dateToParam) : undefined;
      const months = monthsParam ? parseInt(monthsParam, 10) : undefined;

      const [byEventType, bySeverity, byBone, byMonth, recurringPatterns] =
        await Promise.all([
          analyzeTrendsByField(prisma as any, 'eventType', dateFrom, dateTo),
          analyzeTrendsByField(prisma as any, 'severity', dateFrom, dateTo),
          analyzeTrendsByBone(prisma as any, dateFrom, dateTo),
          analyzeTrendsByMonth(prisma as any, months),
          detectRecurringPatterns(prisma as any),
        ]);

      return NextResponse.json({
        data: { byEventType, bySeverity, byBone, byMonth, recurringPatterns },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to analyze trends' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'READ', resource: 'SafetyIncident.Trends' },
    skipCsrf: true,
  },
);
