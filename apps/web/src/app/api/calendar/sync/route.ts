/**
 * Calendar Sync API
 *
 * POST /api/calendar/sync
 * Triggers bidirectional sync for all connected calendars
 */

import { NextRequest, NextResponse } from 'next/server';
import { createProtectedRoute } from '@/lib/api/middleware';
import { syncAllCalendars } from '@/lib/calendar/sync';

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
    } catch (error: any) {
      console.error('Calendar sync error:', error);
      return NextResponse.json(
        { error: 'Failed to sync calendars', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
