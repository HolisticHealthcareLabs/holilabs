/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/spatial/SpatialCard', () => ({
  SpatialCard: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

const { MobilePatientCard } = require('../MobilePatientCard');

const mockPatient = {
  id: 'p1',
  mrn: 'MRN001',
  firstName: 'Laura',
  lastName: 'Santos',
  dateOfBirth: new Date('1990-06-15'),
  gender: 'Female',
  phone: '+5511999999',
  riskLevel: 'HIGH' as const,
};

describe('MobilePatientCard', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders patient name', () => {
    render(<MobilePatientCard patient={mockPatient} />);
    expect(screen.getByText('Laura Santos')).toBeInTheDocument();
  });

  it('shows HIGH RISK badge when riskLevel is HIGH', () => {
    render(<MobilePatientCard patient={mockPatient} />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
  });

  it('renders call button when onCall and phone provided', () => {
    const onCall = jest.fn();
    render(<MobilePatientCard patient={mockPatient} onCall={onCall} />);
    const callBtn = screen.getByLabelText(/Call Laura Santos/i);
    fireEvent.click(callBtn);
    expect(onCall).toHaveBeenCalled();
  });
});
