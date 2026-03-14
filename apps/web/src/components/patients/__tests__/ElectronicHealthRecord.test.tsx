/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/demo/demo-data-generator', () => ({}));

const { ElectronicHealthRecord } = require('../ElectronicHealthRecord');

const mockPatient = {
  id: 'p1',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1980-01-01',
  gender: 'Male',
  riskLevel: 'LOW',
  conditions: ['Diabetes Type 2', 'Hypertension'],
  medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' }],
  preventiveCareFlags: [],
  lastVisit: '2026-03-01',
};

describe('ElectronicHealthRecord', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders "Electronic Health Record" heading', () => {
    render(<ElectronicHealthRecord patient={mockPatient} />);
    expect(screen.getByText('Electronic Health Record')).toBeInTheDocument();
  });

  it('shows active conditions', () => {
    render(<ElectronicHealthRecord patient={mockPatient} />);
    expect(screen.getByText('Active Conditions')).toBeInTheDocument();
    expect(screen.getByText('Diabetes Type 2')).toBeInTheDocument();
  });

  it('shows current medications', () => {
    render(<ElectronicHealthRecord patient={mockPatient} />);
    expect(screen.getByText('Current Medications')).toBeInTheDocument();
    expect(screen.getByText('Metformin')).toBeInTheDocument();
  });
});
