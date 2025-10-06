/**
 * Google Calendar OAuth - Disconnect
 *
 * DELETE /api/calendar/google/disconnect
 * Revokes access and removes calendar integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createProtectedRoute } from '@/lib/api/middleware';

export const DELETE = createProtectedRoute(
  async (request: NextRequest, context: any) => {
    try {
      // Get the calendar integration
      const integration = await prisma.calendarIntegration.findUnique({
        where: {
          userId_provider: {
            userId: context.user.id,
            provider: 'GOOGLE',
          },
        },
      });

      if (!integration) {
        return NextResponse.json(
          { error: 'Calendar integration not found' },
          { status: 404 }
        );
      }

      // Revoke the token with Google
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${integration.accessToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );
      } catch (revokeError) {
        console.error('Failed to revoke Google token:', revokeError);
        // Continue with deletion even if revocation fails
      }

      // Delete the integration
      await prisma.calendarIntegration.delete({
        where: {
          userId_provider: {
            userId: context.user.id,
            provider: 'GOOGLE',
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
          resourceId: 'GOOGLE',
          success: true,
          details: {
            provider: 'GOOGLE',
            calendarEmail: integration.calendarEmail,
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Google Calendar disconnected successfully',
      });
    } catch (error: any) {
      console.error('Google disconnect error:', error);
      return NextResponse.json(
        { error: 'Failed to disconnect Google Calendar', details: error.message },
        { status: 500 }
      );
    }
  },
  {
    roles: ['ADMIN', 'CLINICIAN', 'NURSE', 'STAFF'],
    rateLimit: { windowMs: 60000, maxRequests: 10 },
  }
);
