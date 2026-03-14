/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({
  useTranslations: () => Object.assign((k: string) => k, { raw: () => [] }),
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

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
} as any);

// Class-based IntersectionObserver mock for jsdom
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
}
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

import { BillingComplianceLanding } from '../BillingComplianceLanding';

describe('BillingComplianceLanding', () => {
  it('renders without crashing', () => {
    const { container } = render(<BillingComplianceLanding />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders the navigation header', () => {
    render(<BillingComplianceLanding />);
    expect(document.querySelector('header')).toBeInTheDocument();
  });

  it('renders Holi Labs brand name', () => {
    render(<BillingComplianceLanding />);
    expect(screen.getByText(/Holi Labs/i)).toBeInTheDocument();
  });
});
