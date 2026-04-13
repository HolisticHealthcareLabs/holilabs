export const dynamic = "force-dynamic";
/**
 * Calendar Sync API
 *
 * POST /api/calendar/sync
 * Triggers bidirectional sync for all connected calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { syncAllCalendars } from '@/lib/calendar/sync';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

export const POST = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      const results = await syncAllCalendars(context.user.id);

      const totalSynced =
        (results.google?.synced || 0) +
        (results.microsoft?.synced || 0) +
        (results.apple?.synced || 0);

      return NextResponse.json({
        success: true,
        message: `Synced ${totalSynced} appointments`,
        results,
      });
    } catch (error) {
      logger.error({
        event: 'calendar_sync_failed',
        userId: context.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return safeErrorResponse(error, { userMessage: 'Failed to sync calendars' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
