import { NextRequest, NextResponse } from 'next/server';
import type { MedicalDiscipline } from '@prisma/client';
import { createProtectedRoute } from '@/lib/api/middleware';
import { safeErrorResponse } from '@/lib/api/safe-error-response';
import { getDisciplineConfig } from '@/lib/prevention/disciplines/registry';
import '@/lib/prevention/disciplines/index';

export const dynamic = 'force-dynamic';

const VALID_DISCIPLINES = new Set<string>([
  'CARDIOLOGY', 'ENDOCRINOLOGY', 'ONCOLOGY', 'MENTAL_HEALTH',
  'PEDIATRICS', 'GERIATRICS', 'NEPHROLOGY', 'PULMONOLOGY',
  'OB_GYN', 'PRIMARY_CARE',
]);

export const GET = createProtectedRoute(
  async (_request: NextRequest, context: any) => {
    try {
      const discipline = context.params?.discipline as string;

      if (!VALID_DISCIPLINES.has(discipline)) {
        return NextResponse.json(
          { error: 'Invalid discipline', valid: Array.from(VALID_DISCIPLINES) },
          { status: 400 },
        );
      }

      const config = getDisciplineConfig(discipline as MedicalDiscipline);

      if (!config) {
        return NextResponse.json(
          { error: `Discipline '${discipline}' not found` },
          { status: 404 },
        );
      }

      return NextResponse.json({ data: config });
    } catch (error) {
      return safeErrorResponse(error, { userMessage: 'Failed to load discipline protocols' });
    }
  },
  {
    roles: ['CLINICIAN', 'PHYSICIAN'] as any,
    audit: { action: 'READ', resource: 'PreventionDisciplineProtocol' },
  },
);
