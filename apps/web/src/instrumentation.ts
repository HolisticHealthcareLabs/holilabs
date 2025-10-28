/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts up
 * Used to initialize background services like cron jobs
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAppointmentScheduler } = await import('./lib/jobs/appointment-scheduler');

    // Start the automated reminder scheduler
    startAppointmentScheduler();
  }
}
