/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, t: string) => t }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { raw: (k: string) => [] }),
  useLocale: () => 'en',
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  usePathname: () => '/',
}));
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }),
}));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: () => {} }),
  usePathname: () => '/',
}));

import { PricingPage } from '../PricingPage';

describe('PricingPage', () => {
  it('renders without crashing', () => {
    const { container } = render(<PricingPage />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the billing toggle buttons', () => {
    render(<PricingPage />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the Cortex brand name in nav', () => {
    render(<PricingPage />);
    const matches = screen.getAllByText(/Cortex/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
