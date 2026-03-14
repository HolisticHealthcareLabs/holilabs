/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import InvoicesList from '../InvoicesList';

const mockInvoice = {
  id: 'inv-1',
  invoiceNumber: 'INV-2024-001',
  description: 'Consulta general',
  status: 'PENDING',
  subtotal: 150000,
  taxAmount: 24000,
  totalAmount: 174000,
  amountDue: 174000,
  totalPaid: 0,
  currency: 'MXN',
  issueDate: '2024-01-15T10:00:00.000Z',
  dueDate: '2024-02-15T10:00:00.000Z',
  isOverdue: false,
  lineItems: [],
  payments: [],
};

describe('InvoicesList', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any);
  });

  it('shows loading spinner initially', () => {
    render(<InvoicesList patientId="p1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no invoices', async () => {
    render(<InvoicesList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText(/No hay facturas/i)).toBeInTheDocument();
    });
  });

  it('renders filter buttons', async () => {
    render(<InvoicesList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Todas/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pendientes/i })).toBeInTheDocument();
    });
  });
});
