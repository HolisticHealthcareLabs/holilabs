/**
 * Startup Health Check
 *
 * GET /api/health/startup
 * Kubernetes startup probe — checks if the application has finished initializing.
 * Unlike liveness (process alive) and readiness (can serve traffic), this probe
 * gates both: k8s won't send liveness/readiness probes until startup succeeds.
 *
 * Checks:
 * 1. Prisma client is initialized (DATABASE_URL present + client instantiated)
 * 2. Encryption keys are loaded (ENCRYPTION_KEY env var present)
 *
 * No authentication required — this is a public infrastructure endpoint.
 * The probe is intentionally unauthenticated because load balancers and
 * orchestrators must reach it before any user context exists.
 */

import { NextResponse } from 'next/server';
import { createPublicRoute } from '@/lib/api/middleware';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 60 };

interface StartupCheck {
  status: 'ok' | 'failed';
  error?: string;
}

async function getStartup() {
  const checks: Record<string, StartupCheck> = {};

  // Check 1: Prisma client initialized
  try {
    if (!process.env.DATABASE_URL) {
      checks.database = { status: 'failed', error: 'DATABASE_URL not configured' };
    } else {
      // Verify the Prisma module can be imported and client exists
      const { _prisma } = await import('@/lib/prisma');
      checks.database = _prisma
        ? { status: 'ok' }
        : { status: 'failed', error: 'Prisma client not instantiated' };
    }
  } catch (error) {
    checks.database = {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Prisma import failed',
    };
  }

  // Check 2: Encryption keys loaded
  checks.encryption = process.env.ENCRYPTION_KEY
    ? { status: 'ok' }
    : { status: 'failed', error: 'ENCRYPTION_KEY not configured' };

  const allPassed = Object.values(checks).every((c) => c.status === 'ok');

  return NextResponse.json(
    {
      status: allPassed ? 'started' : 'not_started',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: allPassed ? 200 : 503,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    },
  );
}

export const GET = createPublicRoute(getStartup, { rateLimit: RATE_LIMIT });
