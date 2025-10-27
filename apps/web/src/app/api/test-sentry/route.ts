/**
 * Sentry Test Endpoint
 *
 * Use this to verify Sentry error tracking is working
 *
 * Usage:
 *   curl https://your-app.ondigitalocean.app/api/test-sentry
 *
 * Expected: Should see error in Sentry dashboard within 10 seconds
 */

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

export async function GET() {
  try {
    // Capture a test error
    const error = new Error('🧪 Sentry Test Error - If you see this in Sentry, error tracking is working!');

    Sentry.captureException(error, {
      level: 'error',
      tags: {
        test: true,
        endpoint: 'test-sentry',
        source: 'manual_test'
      },
      contexts: {
        test: {
          message: 'This is a deliberate test error to verify Sentry integration',
          timestamp: new Date().toISOString()
        }
      }
    });

    // Also capture a message
    Sentry.captureMessage('Sentry test endpoint was called', {
      level: 'info',
      tags: {
        test: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Test error sent to Sentry! Check your Sentry dashboard in 10 seconds.',
      instructions: 'Go to: https://sentry.io/organizations/[your-org]/issues/',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // This error will also be captured by Sentry's automatic error tracking
    console.error('Error in test-sentry endpoint:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to send test error to Sentry',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
