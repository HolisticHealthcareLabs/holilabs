'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    // Client-side error logging — console.error is acceptable here
    // since logger.ts is server-only and this is a client component.
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t.errorPages?.somethingWentWrong ?? 'Something went wrong'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {process.env.NODE_ENV === 'development'
            ? error.message
            : (t.errorPages?.unexpectedError ?? 'An unexpected error occurred')}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t.errorPages?.tryAgain ?? 'Try again'}
        </button>
      </div>
    </div>
  );
}
