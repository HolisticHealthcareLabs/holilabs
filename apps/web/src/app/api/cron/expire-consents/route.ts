/**
 * Cron Job: Expire Consents
 *
 * This endpoint should be called periodically (e.g., daily) to expire consents
 * that have passed their expiration date.
 *
 * Usage:
 * - Set up a cron job on your server or use a service like Vercel Cron
 * - Call this endpoint: POST /api/cron/expire-consents
 * - Add authentication header for security
 *
 * Example with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/expire-consents",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { expireAllExpiredConsents } from '@/lib/consent/expiration-checker';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting consent expiration cron job...');

    const expiredCount = await expireAllExpiredConsents();

    console.log(`✅ Expired ${expiredCount} consents`);

    return NextResponse.json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in consent expiration cron:', error);
    return NextResponse.json(
      { error: 'Failed to expire consents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Allow GET for testing purposes (remove in production)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'GET method not allowed in production' }, { status: 405 });
  }

  return POST(request);
}
