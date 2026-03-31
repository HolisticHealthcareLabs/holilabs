'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--surface-secondary)' }}>
      <div className="text-center p-8">
        <h1 className="text-6xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {t('errorPages.notFoundCode')}
        </h1>
        <h2 className="text-2xl mb-6" style={{ color: 'var(--text-secondary)' }}>
          {t('errorPages.notFound')}
        </h2>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 inline-block"
          style={{ borderRadius: 'var(--radius-lg)' }}
          aria-label={t('errorPages.goToSignIn')}
        >
          {t('errorPages.goToSignIn')}
        </Link>
      </div>
    </div>
  );
}
