/**
 * Enterprise Flywheel Assessments API — Phase 6
 *
 * GET /api/enterprise/flywheel/assessments?page=1&limit=50&patient=anon-xxx
 * Auth: x-pharma-partner-key
 *
 * Returns paginated assessment history from the data flywheel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { dataFlywheelService } from '@/services/data-flywheel.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const patientFilter = searchParams.get('patient') ?? undefined;

  let assessments = patientFilter
    ? dataFlywheelService.getAssessmentHistory(patientFilter)
    : dataFlywheelService.getAllAssessments();

  // Sort newest first
  assessments = assessments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const total = assessments.length;
  const start = (page - 1) * limit;
  const paginated = assessments.slice(start, start + limit);

  return NextResponse.json({
    __format: 'enterprise_flywheel_assessments_v1',
    assessments: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
  });
}
