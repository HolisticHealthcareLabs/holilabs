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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const stats = dataFlywheelService.getStats();

  return NextResponse.json({
    __format: 'enterprise_flywheel_stats_v1',
    stats,
    meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
  });
}
