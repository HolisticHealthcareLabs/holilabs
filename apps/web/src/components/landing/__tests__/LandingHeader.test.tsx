/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' as const, toggleTheme: jest.fn() }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en' }) }));
jest.mock('@/components/landing/copy', () => ({
  getLandingCopy: () => ({
    header: { howItWorks: 'How it works', audit: 'Audit', login: 'Log in', betaCta: 'Get Beta Access', betaShort: 'Beta' },
  }),
}));
jest.mock('@/components/LanguageSelector', () => ({ __esModule: true, default: () => null }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));

import { LandingHeader } from '../LandingHeader';

describe('LandingHeader', () => {
  it('renders the Holi Labs brand name', () => {
    render(<LandingHeader />);
    expect(screen.getByText('Holi Labs')).toBeInTheDocument();
  });

  it('renders navigation link for How it works', () => {
    render(<LandingHeader />);
    const links = screen.getAllByText('How it works');
    expect(links.length).toBeGreaterThan(0);
  });

  it('renders login link', () => {
    render(<LandingHeader />);
    const loginLinks = screen.getAllByText('Log in');
    expect(loginLinks.length).toBeGreaterThan(0);
  });
});
