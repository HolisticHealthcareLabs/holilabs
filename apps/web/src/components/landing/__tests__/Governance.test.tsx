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
    governance: {
      kicker: 'Governance',
      subtitle: 'Full audit trail for every AI decision',
      cardOneTitle: 'Outcome Dashboard',
      cardOneBody: 'Track every intervention and result',
      cardTwoTitle: 'Deterministic Logic',
      cardTwoBody: 'Rules you can explain to a judge',
      errorsAvoided: 'Errors avoided',
      weekDelta: '+12 this week',
      complianceRate: 'Compliance rate',
    },
  }),
}));

import { Governance } from '../Governance';

describe('Governance', () => {
  it('renders the governance kicker', () => {
    render(<Governance />);
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('renders both feature cards', () => {
    render(<Governance />);
    expect(screen.getByText('Outcome Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Deterministic Logic')).toBeInTheDocument();
  });

  it('renders the English protection headline', () => {
    render(<Governance />);
    expect(screen.getByText(/Protect high-risk decisions/i)).toBeInTheDocument();
  });
});
