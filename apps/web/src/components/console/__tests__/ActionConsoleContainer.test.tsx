/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));
jest.mock('./ConsoleFilterBar', () => ({
  ConsoleFilterBar: ({ onFilterChange, isLoading }: any) => (
    <div data-testid="filter-bar">Filter Bar</div>
  ),
}));
jest.mock('./KPIGrid', () => ({
  KPIGrid: (props: any) => <div data-testid="kpi-grid">KPI Grid</div>,
}));
jest.mock('./OverrideReasonsRanking', () => ({
  OverrideReasonsRanking: (props: any) => <div data-testid="override-ranking">Override Ranking</div>,
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      totalEvaluations: { value: 100, unit: 'count' },
      blockRate: { value: 3.5, unit: '%' },
      overrideRate: { value: 8.2, unit: '%' },
      attestationCompliance: { value: 96, unit: '%' },
    }),
  })
) as jest.Mock;

const { ActionConsoleContainer } = require('../ActionConsoleContainer');

describe('ActionConsoleContainer', () => {
  it('renders title and description', () => {
    render(<ActionConsoleContainer />);
    expect(screen.getByText('Action Console')).toBeInTheDocument();
    expect(screen.getByText(/DOAC safety rule evaluations/)).toBeInTheDocument();
  });

  it('renders filter bar', () => {
    render(<ActionConsoleContainer />);
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('renders override reasons ranking', () => {
    render(<ActionConsoleContainer />);
    expect(screen.getByTestId('override-ranking')).toBeInTheDocument();
  });
});
