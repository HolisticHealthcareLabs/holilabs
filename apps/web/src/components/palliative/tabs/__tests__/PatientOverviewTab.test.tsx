/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const PatientOverviewTab = require('../PatientOverviewTab').default;

const mockPatient = {
  id: 'p1',
  firstName: 'Carlos',
  lastName: 'Ramirez',
  dateOfBirth: '1970-05-15',
  mrn: 'MRN001',
  tokenId: 'TKN001',
};

describe('PatientOverviewTab', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders patient full name in demographics section', () => {
    render(<PatientOverviewTab patient={mockPatient} />);
    expect(screen.getByText('Carlos Ramirez')).toBeInTheDocument();
  });

  it('shows "Dolor Actual" card header', () => {
    render(<PatientOverviewTab patient={mockPatient} />);
    expect(screen.getByText('Dolor Actual')).toBeInTheDocument();
  });

  it('shows pain score when latestPainAssessment is provided', () => {
    const assessment = { id: 'a1', painScore: 7, assessedAt: '2026-03-01T10:00:00Z' };
    render(<PatientOverviewTab patient={mockPatient} latestPainAssessment={assessment} />);
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });
});
