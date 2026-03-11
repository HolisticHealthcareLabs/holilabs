/**
 * Enterprise Flywheel Stats API — Phase 6
 *
 * GET /api/enterprise/flywheel/stats
 * Auth: x-pharma-partner-key
 *
 * Returns aggregate flywheel statistics (total assessments, tier distribution, latest timestamp).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { dataFlywheelService } from '@/services/data-flywheel.service';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

async function getFlywheelStats(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const stats = dataFlywheelService.getStats();

  return NextResponse.json({
    __format: 'enterprise_flywheel_stats_v1',
    stats,
    meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
  });
}

export const GET = createPublicRoute(getFlywheelStats);
