/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ id: 'inv-1' }),
} as any);

import InvoiceForm from '../InvoiceForm';

describe('InvoiceForm', () => {
  it('renders form with required fields', () => {
    render(<InvoiceForm patientId="p1" />);
    expect(screen.getByText(/Información General/i)).toBeInTheDocument();
    expect(screen.getByText(/Fecha de Vencimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/Conceptos/i)).toBeInTheDocument();
  });

  it('adds a new line item when clicking Agregar Concepto', () => {
    render(<InvoiceForm patientId="p1" />);
    expect(screen.getAllByText(/Concepto \d/i)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Agregar Concepto/i }));
    expect(screen.getAllByText(/Concepto \d/i)).toHaveLength(2);
  });

  it('shows validation error when dueDate is missing on submit', async () => {
    render(<InvoiceForm patientId="p1" />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText(/fecha de vencimiento es requerida/i)).toBeInTheDocument();
    });
  });
});
