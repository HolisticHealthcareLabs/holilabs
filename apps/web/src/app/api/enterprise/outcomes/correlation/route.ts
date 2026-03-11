/**
 * Enterprise Outcome Correlation API — Blue Ocean Phase 5
 *
 * GET /api/enterprise/outcomes/correlation — Aggregate override→outcome stats
 * Auth: x-pharma-partner-key
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { outcomeTrackerService } from '@/services/outcome-tracker.service';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

async function getOutcomeCorrelation(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const correlation = outcomeTrackerService.getOverrideOutcomeCorrelation();
  const outcomes = outcomeTrackerService.getAllOutcomes()
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  return NextResponse.json({
    __format: 'enterprise_outcome_correlation_v1',
    correlation,
    outcomes,
    meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
  });
}

export const GET = createPublicRoute(getOutcomeCorrelation);
