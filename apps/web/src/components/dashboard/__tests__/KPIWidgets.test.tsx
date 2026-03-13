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
jest.mock('./PastelGlassStatCard', () => ({
  PastelGlassStatCard: ({ label, value }: any) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

const { AITimeReclaimedWidgetRadial, PendingResultsWidget } = require('../KPIWidgets');

describe('KPIWidgets', () => {
  it('renders AITimeReclaimedWidgetRadial', () => {
    render(<AITimeReclaimedWidgetRadial />);
    expect(screen.getByText('AI Time Reclaimed')).toBeInTheDocument();
    expect(screen.getByText('12.5h')).toBeInTheDocument();
  });

  it('renders PendingResultsWidget with results', () => {
    render(<PendingResultsWidget />);
    expect(screen.getByText('Pending Results')).toBeInTheDocument();
    expect(screen.getByText('CBC')).toBeInTheDocument();
    expect(screen.getByText('HbA1c')).toBeInTheDocument();
  });
});
