/**
 * Next.js Instrumentation
 *
 * This file is executed when the Node.js server starts.
 * It's the perfect place to initialize monitoring tools like Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server (not edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Initialize Sentry on server
    await import('./sentry.server.config');

    // Log that instrumentation is running
    console.log('✅ Server instrumentation initialized');
  }

  // Initialize Sentry on edge runtime
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');

    console.log('✅ Edge instrumentation initialized');
  }
}
