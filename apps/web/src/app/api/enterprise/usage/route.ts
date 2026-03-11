/**
 * Enterprise Usage API — Blue Ocean Phase 5
 *
 * GET /api/enterprise/usage?from=...&to=...&period=day|week|month
 * Auth: x-pharma-partner-key
 *
 * Returns usage summary (no period) or trend data (with period).
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateEnterpriseKey } from '@/lib/enterprise/auth';
import { enterpriseUsageMeter } from '@/lib/enterprise/usage-meter';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

async function getUsage(request: NextRequest) {
  const auth = validateEnterpriseKey(request);
  if (!auth.authorized) return auth.response!;

  const keyHash = request.headers.get('x-pharma-partner-key')?.slice(0, 8) ?? 'unknown';
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const period = searchParams.get('period') as 'day' | 'week' | 'month' | null;

  if (period) {
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'period must be day, week, or month' },
        { status: 400 },
      );
    }

    const trend = enterpriseUsageMeter.getUsageTrend(keyHash, period);
    return NextResponse.json({
      __format: 'enterprise_usage_trend_v1',
      period,
      trend,
      meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
    });
  }

  const summary = enterpriseUsageMeter.getUsageSummary(keyHash, { from, to });
  return NextResponse.json({
    __format: 'enterprise_usage_summary_v1',
    summary,
    meta: { apiVersion: '1.0.0', generatedAt: new Date().toISOString() },
  });
}

export const GET = createPublicRoute(getUsage);
