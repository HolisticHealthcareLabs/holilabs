/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const ConsentManager = require('../ConsentManager').default;

describe('ConsentManager', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders "Plantillas de Consentimiento" heading', () => {
    render(<ConsentManager />);
    expect(screen.getByText('Plantillas de Consentimiento')).toBeInTheDocument();
  });

  it('renders consent template titles', () => {
    render(<ConsentManager />);
    expect(screen.getByText('Consentimiento Informado para Consulta Médica General')).toBeInTheDocument();
    expect(screen.getByText('Consentimiento para Telemedicina y Comunicación Electrónica')).toBeInTheDocument();
  });

  it('opens editor view when "Editar con IA" is clicked', () => {
    render(<ConsentManager />);
    const editButtons = screen.getAllByText('Editar con IA');
    fireEvent.click(editButtons[0]);
    expect(screen.getByText('Editor de Consentimiento con IA')).toBeInTheDocument();
  });
});
