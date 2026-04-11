'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface DemoCredentialsBannerProps {
  variant: 'clinician' | 'patient';
}

export function DemoCredentialsBanner({ variant }: DemoCredentialsBannerProps) {
  const t = useTranslations('demoBanner');
  const [dismissed, setDismissed] = useState(false);

  if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return null;
  }

  if (dismissed) return null;

  const credentials = variant === 'clinician'
    ? [
        { label: 'Dr. Silva', email: 'dr.silva@holilabs.xyz', password: 'Cortex2026!' },
        { label: 'Clinician', email: 'doctor@holilabs.com', password: 'Demo123!@#' },
      ]
    : [
        { label: 'Maria Oliveira', email: 'maria.oliveira@example.com', password: 'Patient2026!' },
      ];

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-warning)',
        border: '1px solid var(--text-warning)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-md)',
        marginBottom: 'var(--space-lg)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--text-warning)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text-warning)' }}
          >
            {t('title')}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-warning)' }}
          aria-label={t('dismiss')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {credentials.map((cred) => (
          <div
            key={cred.email}
            className="flex flex-col gap-0.5"
          >
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {cred.label}
            </span>
            <code
              className="text-xs select-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              {cred.email} / {cred.password}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}
