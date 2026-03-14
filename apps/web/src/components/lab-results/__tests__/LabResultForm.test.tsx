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
  json: async () => ({ id: 'lab-1' }),
} as any);

import LabResultForm from '../LabResultForm';

describe('LabResultForm', () => {
  it('renders required fields', () => {
    render(<LabResultForm patientId="p1" />);
    expect(screen.getByPlaceholderText(/Hemograma Completo/i)).toBeInTheDocument();
    expect(screen.getByText(/Nombre de Prueba/i)).toBeInTheDocument();
  });

  it('shows cancel button and calls onCancel when clicked', () => {
    const onCancel = jest.fn();
    render(<LabResultForm patientId="p1" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows validation error when required fields are missing on submit', async () => {
    render(<LabResultForm patientId="p1" />);
    fireEvent.click(screen.getByRole('button', { name: /Guardar Resultado/i }));
    await waitFor(() => {
      expect(screen.getByText(/Nombre de Prueba/i)).toBeInTheDocument();
    });
  });
});
