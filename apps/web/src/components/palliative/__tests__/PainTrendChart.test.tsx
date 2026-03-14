/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ReferenceLine: () => null,
}));

const PainTrendChart = require('../PainTrendChart').default;

const mockAssessments = [
  { id: 'a1', painScore: 5, assessedAt: '2026-03-01T10:00:00Z', location: 'Back', interventionsGiven: [] },
  { id: 'a2', painScore: 3, assessedAt: '2026-03-02T10:00:00Z', interventionsGiven: ['Morphine'] },
];

describe('PainTrendChart', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders empty state when no assessments', () => {
    render(<PainTrendChart assessments={[]} />);
    expect(screen.getByText('Sin datos de dolor')).toBeInTheDocument();
  });

  it('renders statistics header when assessments provided', () => {
    render(<PainTrendChart assessments={mockAssessments} />);
    expect(screen.getByText(/Tendencia del Dolor/)).toBeInTheDocument();
  });

  it('shows current pain score label', () => {
    render(<PainTrendChart assessments={mockAssessments} />);
    expect(screen.getByText('Dolor Actual')).toBeInTheDocument();
  });
});
