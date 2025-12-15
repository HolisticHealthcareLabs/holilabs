/**
 * Microsoft Outlook OAuth - Disconnect
 *
 * DELETE /api/calendar/microsoft/disconnect
 * Removes calendar integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';

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
            provider: 'MICROSOFT',
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
            provider: 'MICROSOFT',
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
          resourceId: 'MICROSOFT',
          success: true,
          details: {
            provider: 'MICROSOFT',
            calendarEmail: integration.calendarEmail,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Microsoft Outlook disconnected successfully',
      });
    } catch (error: any) {
      logger.error({
        event: 'calendar_microsoft_disconnect_failed',
        userId: context.user?.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: 'Failed to disconnect Microsoft Outlook', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
