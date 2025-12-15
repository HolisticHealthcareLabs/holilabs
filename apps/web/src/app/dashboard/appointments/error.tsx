'use client';

/**
 * Error Boundary for Appointments Routes
 * Catches errors in appointment scheduling and management
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import { ExclamationTriangleIcon, CalendarIcon } from '@heroicons/react/24/outline';

export default function AppointmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'appointments',
        route: '/dashboard/appointments',
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
            <CalendarIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Appointments Error
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          We encountered an issue while loading your appointments. Our team has been notified.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 mb-2">
              Error Details (Development Only)
            </summary>
            <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center"
          >
            Go to Dashboard
          </a>
        </div>

        {/* Decorative element - low contrast intentional */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Error ID: {error.digest || 'Unknown'}
        </p>
      </div>
    </div>
  );
}
