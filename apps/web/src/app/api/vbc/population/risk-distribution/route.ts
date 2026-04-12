import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getRiskDistribution } from '@/lib/vbc/population-health.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId query parameter is required' },
          { status: 400 },
        );
      }

      const distribution = await getRiskDistribution(prisma, organizationId);

      return NextResponse.json({ success: true, data: distribution });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch risk distribution' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN'] as any,
    audit: { action: 'READ', resource: 'PatientAttribution' },
  },
);
