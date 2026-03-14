/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const ClinicalNotesTab = require('../ClinicalNotesTab').default;

const mockNotes = [
  {
    id: 'n1',
    subjective: 'Patient reports mild pain',
    objective: 'BP 120/80',
    assessment: 'Stable condition',
    plan: 'Continue current treatment',
    isSigned: true,
    createdAt: '2026-03-01T10:00:00Z',
    createdBy: 'dr1',
    patientNotified: false,
    templateType: 'PALLIATIVE_FOLLOWUP',
  },
];

describe('ClinicalNotesTab', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders empty state when no notes', () => {
    render(<ClinicalNotesTab soapNotes={[]} patientId="p1" />);
    expect(screen.getByText('Sin notas clínicas')).toBeInTheDocument();
  });

  it('renders note template label when notes provided', () => {
    render(<ClinicalNotesTab soapNotes={mockNotes} patientId="p1" />);
    expect(screen.getByText('Seguimiento Paliativo')).toBeInTheDocument();
  });

  it('shows signed badge on signed notes', () => {
    render(<ClinicalNotesTab soapNotes={mockNotes} patientId="p1" />);
    expect(screen.getByText('Firmada')).toBeInTheDocument();
  });
});
