import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getAllDisciplineConfigs } from '@/lib/prevention/disciplines/registry';
import '@/lib/prevention/disciplines/index';

export const dynamic = 'force-dynamic';

export const GET = createProtectedRoute(
  async (_request: NextRequest) => {
    try {
      const configs = getAllDisciplineConfigs();

      const disciplines = configs.map((config) => ({
        discipline: config.discipline,
        displayName: config.displayName,
        description: config.description,
        jurisdictions: config.jurisdictions,
      }));

      return NextResponse.json({ data: disciplines });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to list disciplines' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'READ', resource: 'PreventionDiscipline' },
  },
);
