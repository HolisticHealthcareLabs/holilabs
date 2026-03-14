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
    dataMoat: {
      kicker: 'Data Advantage',
      title: 'The Data Moat',
      subtitle: 'Every encounter builds your edge',
      flywheel: 'More data → better models → better outcomes',
      cards: [
        { title: 'Longitudinal Records', body: 'Captures every clinical interaction', metric: '10M+ events' },
        { title: 'Outcome Flywheel', body: 'Models improve with each case', metric: '94% accuracy' },
      ],
    },
  }),
}));

import { DataMoat } from '../DataMoat';

describe('DataMoat', () => {
  it('renders section with kicker text', () => {
    render(<DataMoat />);
    expect(screen.getByText('Data Advantage')).toBeInTheDocument();
  });

  it('renders the flywheel statement', () => {
    render(<DataMoat />);
    expect(screen.getByText('More data → better models → better outcomes')).toBeInTheDocument();
  });

  it('renders moat cards', () => {
    render(<DataMoat />);
    expect(screen.getByText('Longitudinal Records')).toBeInTheDocument();
    expect(screen.getByText('Outcome Flywheel')).toBeInTheDocument();
  });
});
