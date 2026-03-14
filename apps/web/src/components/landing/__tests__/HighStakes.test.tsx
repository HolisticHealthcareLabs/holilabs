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
    safety: {
      kicker: 'Patient Safety First',
      title: 'High-Stakes AI',
      cards: [
        { title: 'Drug Interaction Guard', body: 'Checks 50,000+ interactions', bulletA: 'Real-time alerts', bulletB: 'Severity scoring' },
        { title: 'Dosing Safety Net', body: 'Weight-adjusted dosing', bulletA: 'Pediatric support', bulletB: 'Renal adjustment' },
        { title: 'Allergy Firewall', body: 'Cross-reactivity logic', bulletA: 'ICD-10 coded', bulletB: 'SNOMED mapped' },
      ],
    },
  }),
}));

import { HighStakes } from '../HighStakes';

describe('HighStakes', () => {
  it('renders the safety kicker', () => {
    render(<HighStakes />);
    expect(screen.getByText('Patient Safety First')).toBeInTheDocument();
  });

  it('renders the section title', () => {
    render(<HighStakes />);
    expect(screen.getByText('High-Stakes AI')).toBeInTheDocument();
  });

  it('renders all safety card titles', () => {
    render(<HighStakes />);
    expect(screen.getByText('Drug Interaction Guard')).toBeInTheDocument();
    expect(screen.getByText('Dosing Safety Net')).toBeInTheDocument();
    expect(screen.getByText('Allergy Firewall')).toBeInTheDocument();
  });
});
