'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">
          {t.errorPages?.notFoundCode ?? '404'}
        </h1>
        <h2 className="text-2xl text-gray-700 dark:text-gray-300 mb-6">
          {t.errorPages?.notFound ?? 'Page not found'}
        </h2>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          aria-label={t.errorPages?.goToSignIn ?? 'Go to Sign In'}
        >
          {t.errorPages?.goToSignIn ?? 'Go to Sign In'}
        </Link>
      </div>
    </div>
  );
}
