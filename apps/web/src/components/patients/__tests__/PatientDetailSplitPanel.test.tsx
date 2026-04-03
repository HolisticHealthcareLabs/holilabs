/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
jest.mock('@/components/ui/Input', () => ({
  Input: (props: any) => <input {...props} />,
}));
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));

const { PatientDetailSplitPanel } = require('../PatientDetailSplitPanel');

const mockPatients = [
  {
    id: 'p1',
    mrn: 'MRN001',
    firstName: 'Elena',
    lastName: 'Fuentes',
    tokenId: 'TKN001',
    isActive: true,
    riskLevel: 'low',
    ageBand: '40-50',
    region: 'SP',
    medications: [],
    appointments: [],
  },
];

describe('PatientDetailSplitPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as jest.Mock;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('shows "Patient Not Found" when patientId does not match', () => {
    render(<PatientDetailSplitPanel patientId="unknown" patients={mockPatients} />);
    expect(screen.getByText('Patient Not Found')).toBeInTheDocument();
  });

  it('renders patient name when patient is found', () => {
    render(<PatientDetailSplitPanel patientId="p1" patients={mockPatients} />);
    const nameElements = screen.getAllByText('Elena Fuentes');
    expect(nameElements.length).toBeGreaterThan(0);
  });

  it('renders Overview tab and can switch to Medications tab', () => {
    render(<PatientDetailSplitPanel patientId="p1" patients={mockPatients} />);
    const overviewElements = screen.getAllByText('Overview');
    expect(overviewElements.length).toBeGreaterThan(0);
    const medButtons = screen.getAllByText('Medications');
    fireEvent.click(medButtons[0]);
    expect(screen.getByText('Active Medications')).toBeInTheDocument();
  });
});
