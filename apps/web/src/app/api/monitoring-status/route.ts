/**
 * Monitoring Services Status Check
 *
 * Checks the configuration status of all monitoring services:
 * - PostHog (Analytics)
 * - Sentry (Error Tracking)
 * - Logtail (Logging)
 *
 * Usage:
 *   curl https://your-app.ondigitalocean.app/api/monitoring-status
 */

import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const checks = {
      posthog: {
        name: 'PostHog Analytics',
        configured: false,
        keyPresent: false,
        hostPresent: false,
        status: 'not_configured',
        message: ''
      },
      sentry: {
        name: 'Sentry Error Tracking',
        configured: false,
        dsnPresent: false,
        status: 'not_configured',
        message: ''
      },
      logtail: {
        name: 'BetterStack Logtail',
        configured: false,
        tokenPresent: false,
        status: 'not_configured',
        message: ''
      }
    };

    // Check PostHog
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    checks.posthog.keyPresent = !!posthogKey && posthogKey.startsWith('phc_');
    checks.posthog.hostPresent = !!posthogHost;
    checks.posthog.configured = checks.posthog.keyPresent && checks.posthog.hostPresent;

    if (checks.posthog.configured) {
      checks.posthog.status = 'configured';
      checks.posthog.message = '✅ PostHog is configured and ready';
    } else if (checks.posthog.keyPresent && !checks.posthog.hostPresent) {
      checks.posthog.status = 'partial';
      checks.posthog.message = '⚠️ PostHog key present but host missing';
    } else if (!checks.posthog.keyPresent) {
      checks.posthog.status = 'not_configured';
      checks.posthog.message = '❌ PostHog API key not configured';
    }

    // Check Sentry
    const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    checks.sentry.dsnPresent = !!sentryDsn && sentryDsn.includes('sentry.io');
    checks.sentry.configured = checks.sentry.dsnPresent;

    if (checks.sentry.configured) {
      checks.sentry.status = 'configured';
      checks.sentry.message = '✅ Sentry is configured and ready';
    } else {
      checks.sentry.status = 'not_configured';
      checks.sentry.message = '❌ Sentry DSN not configured';
    }

    // Check Logtail
    const logtailToken = process.env.LOGTAIL_SOURCE_TOKEN;
    checks.logtail.tokenPresent = !!logtailToken && logtailToken.length > 20;
    checks.logtail.configured = checks.logtail.tokenPresent;

    if (checks.logtail.configured) {
      checks.logtail.status = 'configured';
      checks.logtail.message = '✅ Logtail is configured and ready';
    } else {
      checks.logtail.status = 'not_configured';
      checks.logtail.message = '❌ Logtail token not configured';
    }

    // Calculate overall status
    const allConfigured = checks.posthog.configured && checks.sentry.configured && checks.logtail.configured;
    const someConfigured = checks.posthog.configured || checks.sentry.configured || checks.logtail.configured;

    let overallStatus = 'not_configured';
    let overallMessage = '';

    if (allConfigured) {
      overallStatus = 'fully_configured';
      overallMessage = '🎉 All monitoring services are configured and ready!';
    } else if (someConfigured) {
      overallStatus = 'partially_configured';
      overallMessage = '⚠️ Some monitoring services need configuration';
    } else {
      overallStatus = 'not_configured';
      overallMessage = '❌ No monitoring services configured yet';
    }

    // Next steps
    const nextSteps = [];

    if (!checks.posthog.configured) {
      nextSteps.push({
        service: 'PostHog',
        action: 'Create account at https://us.posthog.com/signup',
        envVars: ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST']
      });
    }

    if (!checks.sentry.configured) {
      nextSteps.push({
        service: 'Sentry',
        action: 'Create account at https://sentry.io/signup/',
        envVars: ['NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_AUTH_TOKEN']
      });
    }

    if (!checks.logtail.configured) {
      nextSteps.push({
        service: 'BetterStack',
        action: 'Create account at https://betterstack.com/logtail',
        envVars: ['LOGTAIL_SOURCE_TOKEN']
      });
    }

    const responseData = {
      status: overallStatus,
      message: overallMessage,
      timestamp: new Date().toISOString(),
      services: checks,
      summary: {
        total: 3,
        configured: [checks.posthog.configured, checks.sentry.configured, checks.logtail.configured].filter(Boolean).length,
        pending: nextSteps.length
      },
      nextSteps: nextSteps.length > 0 ? nextSteps : ['All services configured! Run test endpoints to verify.'],
      testEndpoints: {
        posthog: '/api/test-posthog',
        sentry: '/api/test-sentry',
        overall: '/api/monitoring-status'
      },
      documentation: '/MONITORING_SETUP_INSTRUCTIONS.md'
    };

    logger.info({
      event: 'monitoring_status_check',
      overallStatus,
      configured: responseData.summary.configured,
      pending: responseData.summary.pending,
    });

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    logger.error({
      event: 'monitoring_status_check_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to check monitoring services status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
