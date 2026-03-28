import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const code = context.params?.code;
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId query parameter is required' },
          { status: 400 },
        );
      }

      const measure = await prisma.qualityMeasure.findUnique({
        where: { code },
      });

      if (!measure) {
        return NextResponse.json({ error: `Measure "${code}" not found` }, { status: 404 });
      }

      const latestResult = await prisma.qualityMeasureResult.findFirst({
        where: { measureId: measure.id, organizationId },
        orderBy: { calculatedAt: 'desc' },
      });

      if (!latestResult) {
        return NextResponse.json({
          success: true,
          data: {
            measureCode: code,
            measureName: measure.name,
            gapPatientIds: [],
            gapCount: 0,
            rate: null,
            targetRate: measure.targetRate,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          measureCode: code,
          measureName: measure.name,
          gapPatientIds: latestResult.gapPatientIds,
          gapCount: latestResult.gapPatientIds.length,
          rate: latestResult.rate,
          targetRate: measure.targetRate,
          meetsTarget: latestResult.meetsTarget,
          periodStart: latestResult.periodStart,
          periodEnd: latestResult.periodEnd,
        },
      });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch measure gaps' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'QualityMeasureResult' },
  },
);
