/**
 * Calendar Integrations - Status
 *
 * GET /api/calendar/status
 * Returns current status of all calendar integrations for the user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';


export const GET = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Get all calendar integrations for the user
      const integrations = await prisma.calendarIntegration.findMany({
        where: {
          userId: context.user.id,
        },
        select: {
          id: true,
          provider: true,
          calendarEmail: true,
          calendarName: true,
          lastSyncAt: true,
          syncEnabled: true,
          syncErrors: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Format response
      const status = {
        google: integrations.find((i) => i.provider === 'GOOGLE') || null,
        microsoft: integrations.find((i) => i.provider === 'MICROSOFT') || null,
        apple: integrations.find((i) => i.provider === 'APPLE') || null,
      };

      return NextResponse.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('Calendar status error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar status', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 60 },
    skipCsrf: true,
  }
);
