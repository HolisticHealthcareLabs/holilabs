/**
 * Test Push Notification API
 * Sends a test push notification to the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePatientSession } from '@/lib/auth/patient-session';
import { sendTestNotification } from '@/lib/notifications/send-push';

export async function POST(request: NextRequest) {
  try {
    // Authenticate patient
    const session = await requirePatientSession();

    // Send test push notification
    const result = await sendTestNotification(session.userId);

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
  } catch (error) {
    console.error('Test push notification error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send test notification',
      },
      { status: 500 }
    );
  }
}
