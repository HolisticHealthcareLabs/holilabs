/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const DataIngestion = require('../DataIngestion').default;

const defaultProps = {
  patientId: 'p1',
  onContextUpdate: jest.fn(),
};

describe('DataIngestion', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders section heading', () => {
    render(<DataIngestion {...defaultProps} />);
    expect(screen.getByText('Sincronización de Contexto del Paciente')).toBeInTheDocument();
  });

  it('renders drag-and-drop upload zone heading', () => {
    render(<DataIngestion {...defaultProps} />);
    expect(screen.getByText(/Arrastra documentos aquí/)).toBeInTheDocument();
  });

  it('renders "Seleccionar Archivos" button', () => {
    render(<DataIngestion {...defaultProps} />);
    expect(screen.getByText('Seleccionar Archivos')).toBeInTheDocument();
  });
});
