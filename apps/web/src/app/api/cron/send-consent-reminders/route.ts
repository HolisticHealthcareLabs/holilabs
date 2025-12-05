/**
 * Consent Expiration Reminders Cron Job
 * Sends reminders for consents expiring soon
 *
 * Schedule: Daily (checks for consents expiring in 7 days)
 * POST /api/cron/send-consent-reminders
 *
 * Environment Variables:
 * - CRON_SECRET: Secret token for authentication
 * - CONSENT_REMINDER_DAYS: Days before expiration to send reminder (default: 7)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processConsentReminders } from '@/lib/consent/reminder-service';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📋 Starting consent expiration reminder processing...');

    // Get reminder timing from env (default 7 days before expiration)
    const reminderDays = parseInt(process.env.CONSENT_REMINDER_DAYS || '7', 10);

    const result = await processConsentReminders(reminderDays);

    console.log(
      `✅ Processed ${result.processed} consent reminders, ${result.skipped} skipped, ${result.failed} failed`
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      skipped: result.skipped,
      failed: result.failed,
      reminderDays,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing consent reminders:', error);
    return NextResponse.json(
      {
        error: 'Failed to process consent reminders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing in development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'GET method not allowed in production' }, { status: 405 });
  }

  return POST(request);
}
