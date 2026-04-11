'use client';

/**
 * Error Boundary for Admin Routes
 * Catches errors in admin dashboard and settings
 */

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('dashboard.adminError');

  useEffect(() => {
    // Log error to console (Sentry removed)
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4">
            <ShieldExclamationIcon className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('title')}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            {t('tryAgain')}
          </button>
          <a
            href="/dashboard"
            className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-center"
          >
            {t('goToDashboard')}
          </a>
        </div>

      </div>
    </div>
  );
}
