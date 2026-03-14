/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en' }) }));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    architecture: {
      kicker: 'Platform Modules',
      title: 'Four Pillars',
      subtitle: 'Built for clinicians',
      cards: [
        { title: 'Safety Layer', body: 'Guards every AI call', chipA: 'RBAC', chipB: 'Audit' },
        { title: 'Clinical Intelligence', body: 'Evidence-based CDS', chipA: 'LOINC', chipB: 'ICD-10' },
      ],
    },
  }),
}));

import { Architecture } from '../Architecture';

describe('Architecture', () => {
  it('renders section with kicker text', () => {
    render(<Architecture />);
    expect(screen.getByText('Platform Modules')).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<Architecture />);
    expect(screen.getByText('Four Pillars')).toBeInTheDocument();
  });

  it('renders card titles from copy', () => {
    render(<Architecture />);
    expect(screen.getByText('Safety Layer')).toBeInTheDocument();
    expect(screen.getByText('Clinical Intelligence')).toBeInTheDocument();
  });
});
