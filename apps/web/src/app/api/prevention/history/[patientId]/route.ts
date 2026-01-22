/**
 * Prevention History API
 *
 * GET /api/prevention/history/[patientId]
 * Fetches complete prevention history for a patient including:
 * - Plan version history
 * - Timeline events
 * - Screening compliance
 *
 * Phase 3: History & Compliance
 * Latency Budget: ≤200ms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getPreventionHistoryService } from '@/lib/services/prevention-history.service';
import logger from '@/lib/logger';
import { auditView } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ patientId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const start = performance.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Optional planId filter from query params
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId') || undefined;

    const historyService = getPreventionHistoryService();
    const history = await historyService.getCompleteHistory(patientId, planId);

    const elapsed = performance.now() - start;

    logger.info({
      event: 'prevention_history_fetched',
      patientId,
      planId,
      versionCount: history.versions.length,
      timelineCount: history.timeline.length,
      latencyMs: elapsed.toFixed(2),
      userId: session.user.id,
    });

    // HIPAA Audit: Log prevention history view
    await auditView('PreventionPlan', patientId, request, {
      patientId,
      planId: planId || 'all',
      versionCount: history.versions.length,
      timelineCount: history.timeline.length,
      action: 'prevention_history_viewed',
    });

    return NextResponse.json({
      success: true,
      data: history,
      meta: {
        latencyMs: Math.round(elapsed),
      },
    });
  } catch (error) {
    const elapsed = performance.now() - start;

    logger.error({
      event: 'prevention_history_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      latencyMs: elapsed.toFixed(2),
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch prevention history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
