import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { listAttributions, getAttributionSummary } from '@/lib/vbc/attribution.service';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const providerId = searchParams.get('providerId') ?? undefined;
      const summary = searchParams.get('summary') === 'true';

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId query parameter is required' },
          { status: 400 },
        );
      }

      if (summary) {
        const data = await getAttributionSummary(prisma, organizationId);
        return NextResponse.json({ success: true, data });
      }

      const data = await listAttributions(prisma, organizationId, providerId);
      return NextResponse.json({ success: true, data });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to fetch attributions' });
    }
  },
  {
    roles: ['ADMIN'] as any,
    audit: { action: 'READ', resource: 'PatientAttribution' },
  },
);
