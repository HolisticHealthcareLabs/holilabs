/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up
 * Used to initialize Sentry and background services like cron jobs
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  // Initialize Sentry
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }

  // Only run background jobs on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // TODO: Re-enable when node-cron is installed
    // const { startAppointmentScheduler } = await import('./lib/jobs/appointment-scheduler');
    // startAppointmentScheduler();
  }
}

export const onRequestError = Sentry.captureRequestError;
