/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const ClinicalNotesEditor = require('../ClinicalNotesEditor').default;

const defaultProps = {
  patientId: 'p1',
  clinicianId: 'dr1',
  patientName: 'Ana López',
  onClose: jest.fn(),
  onSave: jest.fn(),
};

describe('ClinicalNotesEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as jest.Mock;
  });

  it('renders "Editor de Notas Clínicas" heading', () => {
    render(<ClinicalNotesEditor {...defaultProps} />);
    expect(screen.getByText('Editor de Notas Clínicas')).toBeInTheDocument();
  });

  it('shows patient name in header', () => {
    render(<ClinicalNotesEditor {...defaultProps} />);
    expect(screen.getByText('Paciente: Ana López')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(<ClinicalNotesEditor {...defaultProps} />);
    expect(screen.getByLabelText('Cerrar editor')).toBeInTheDocument();
  });
});
