/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

jest.mock('@/components/onboarding/SpotlightTrigger', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/demo/dashboard-mocks', () => ({
  DEMO_CLAIMS: [
    {
      id: 'CLM-001',
      patientName: 'Maria Silva',
      encounterDate: '2024-01-01',
      provider: 'Dr. Test',
      status: 'approved',
      country: 'BR',
      totalValue: 500,
      currency: 'BRL',
      payer: 'Unimed',
      cdiFlags: 0,
      billingCodes: [],
    },
  ],
  getDemoBillingStats: () => ({
    totalBilled: 10000,
    approvalRate: 85,
    deniedCount: 2,
    cdiAlerts: 1,
    pendingCount: 3,
    totalClaims: 10,
    totalApproved: 8500,
    currency: 'BRL',
  }),
}));

const ClaimsIntelligencePage = require('../page').default;

describe('ClaimsIntelligencePage (billing)', () => {
  it('renders without crashing', () => {
    const { container } = render(<ClaimsIntelligencePage />);
    expect(container).toBeInTheDocument();
  });

  it('renders the page heading (claimsIntelligence key)', () => {
    render(<ClaimsIntelligencePage />);
    expect(screen.getByText('claimsIntelligence')).toBeInTheDocument();
  });

  it('renders KPI row with billing stats keys', () => {
    render(<ClaimsIntelligencePage />);
    expect(screen.getByText('totalBilled')).toBeInTheDocument();
  });
});
