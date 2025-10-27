/**
 * PostHog Test Endpoint
 *
 * Use this to verify PostHog analytics is working
 *
 * Usage:
 *   curl https://your-app.ondigitalocean.app/api/test-posthog
 *
 * Expected: Should see event in PostHog Live Events within 30-60 seconds
 */

import { NextResponse } from 'next/server';
import { PostHog } from 'posthog-node';

export async function GET(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'PostHog not configured',
      message: 'NEXT_PUBLIC_POSTHOG_KEY environment variable is not set',
      instructions: 'Add PostHog API key to DigitalOcean environment variables'
    }, { status: 500 });
  }

  try {
    // Initialize PostHog client
    const posthog = new PostHog(apiKey, {
      host: apiHost
    });

    const testUserId = `test-user-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Capture multiple test events
    posthog.capture({
      distinctId: testUserId,
      event: 'test_event',
      properties: {
        timestamp,
        source: 'manual_test',
        endpoint: 'test-posthog',
        message: '🧪 PostHog Test Event - If you see this, analytics is working!',
        environment: process.env.NODE_ENV || 'production'
      }
    });

    // Identify the test user
    posthog.identify({
      distinctId: testUserId,
      properties: {
        test: true,
        created_at: timestamp
      }
    });

    // Flush events to ensure they're sent immediately
    await posthog.shutdown();

    return NextResponse.json({
      success: true,
      message: 'Test event sent to PostHog! Check Live Events in 30-60 seconds.',
      details: {
        event: 'test_event',
        distinctId: testUserId,
        timestamp
      },
      instructions: [
        `1. Go to: ${apiHost.replace('i.posthog.com', 'posthog.com')}/project/[your-project-id]/events`,
        '2. Click "Live" tab to see events in real-time',
        '3. Look for event: test_event',
        '4. Verify timestamp matches: ' + timestamp
      ]
    });

  } catch (error) {
    console.error('Error in test-posthog endpoint:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to send test event to PostHog',
      details: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: [
        'Verify NEXT_PUBLIC_POSTHOG_KEY is correct (starts with phc_)',
        'Verify NEXT_PUBLIC_POSTHOG_HOST is set to https://us.i.posthog.com',
        'Check PostHog project is active',
        'Wait 60 seconds and try again'
      ]
    }, { status: 500 });
  }
}
