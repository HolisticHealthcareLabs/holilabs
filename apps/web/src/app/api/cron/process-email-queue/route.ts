/**
 * Email Queue Processor Cron Job
 * Processes queued emails in background
 *
 * Schedule: Every 5 minutes
 * POST /api/cron/process-email-queue
 */

import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue } from '@/lib/email/email-service';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting email queue processing...');

    const result = await processEmailQueue(50); // Process up to 50 emails per run

    console.log(`✅ Processed ${result.processed} emails, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      {
        error: 'Failed to process email queue',
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
