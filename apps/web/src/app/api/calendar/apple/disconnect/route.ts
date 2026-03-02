/**
 * Apple Calendar - Disconnect
 *
 * DELETE /api/calendar/apple/disconnect
 * Removes Apple Calendar integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { safeErrorResponse } from '@/lib/api/safe-error-response';

// Force dynamic rendering - prevents build-time evaluation
export const dynamic = 'force-dynamic';

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Get the calendar integration
      const integration = await prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId: context.user.id,
            provider: 'APPLE',
          },
        },
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Calendar integration not found' },
          { status: 404 }
        );
      }

      // Delete the integration
      await prisma.calendarIntegration.delete({
        where: {
          userId_provider: {
            userId: context.user.id,
            provider: 'APPLE',
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: context.user.id,
          userEmail: context.user.email,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          action: 'DELETE',
          resource: 'CalendarIntegration',
          resourceId: 'APPLE',
          success: true,
          details: {
            provider: 'APPLE',
            calendarEmail: integration.calendarEmail,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Apple Calendar disconnected successfully',
      });
    } catch (error) {
      logger.error({
        event: 'calendar_apple_disconnect_failed',
        userId: context.user?.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return safeErrorResponse(error, { userMessage: 'Failed to disconnect Apple Calendar' });
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
