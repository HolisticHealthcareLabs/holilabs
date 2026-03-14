/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { raw: (k: string) => [] }),
  useLocale: () => 'en',
}));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
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
    // toggle.monthly and toggle.annually both return the key (k => k mock)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders the Cortex brand name in nav', () => {
    render(<PricingPage />);
    expect(screen.getByText(/Cortex/i)).toBeInTheDocument();
  });
});
