/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('../../PainTrendChart', () => ({ __esModule: true, default: () => <div data-testid="pain-chart" /> }));

const PainHistoryTab = require('../PainHistoryTab').default;

const mockAssessments = [
  {
    id: 'a1',
    painScore: 6,
    assessedAt: '2026-03-01T10:00:00Z',
    assessedBy: 'dr1',
    painType: 'CHRONIC',
  },
];

describe('PainHistoryTab', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders empty state when no pain assessments', () => {
    render(<PainHistoryTab painAssessments={[]} patientId="p1" />);
    expect(screen.getByText('Sin evaluaciones de dolor')).toBeInTheDocument();
  });

  it('shows chart view (PainTrendChart) by default when assessments exist', () => {
    render(<PainHistoryTab painAssessments={mockAssessments} patientId="p1" />);
    expect(screen.getByTestId('pain-chart')).toBeInTheDocument();
  });

  it('switches to list view when "Lista" button is clicked', () => {
    render(<PainHistoryTab painAssessments={mockAssessments} patientId="p1" />);
    fireEvent.click(screen.getByText(/Lista/));
    expect(screen.getByText('Dolor moderado')).toBeInTheDocument();
  });
});
