export const dynamic = "force-dynamic";
/**
 * Test Push Notification API
 * Sends a test push notification to the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPatientPortalRoute, type PatientPortalContext } from '@/lib/api/patient-portal-middleware';
import { sendTestNotification } from '@/lib/notifications/send-push';

export const POST = createPatientPortalRoute(
  async (request: NextRequest, context: PatientPortalContext) => {
    const result = await sendTestNotification(context.session.userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        data: {
          sentCount: result.sentCount,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send test notification',
          details: result.errors,
        },
        { status: 500 }
      );
    }
  },
  { audit: { action: 'CREATE', resource: 'TestPush' } }
);
