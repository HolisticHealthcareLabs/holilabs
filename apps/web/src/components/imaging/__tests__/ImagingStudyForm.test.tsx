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
  json: async () => ({ id: 'new-study' }),
} as any);

import ImagingStudyForm from '../ImagingStudyForm';

describe('ImagingStudyForm', () => {
  it('renders required form sections', () => {
    render(<ImagingStudyForm patientId="p1" />);
    expect(screen.getByText(/Información del Estudio/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Estado/i).length).toBeGreaterThan(0);
  });

  it('shows cancel button and calls onCancel when clicked', () => {
    const onCancel = jest.fn();
    render(<ImagingStudyForm patientId="p1" onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows error when submitting without required fields', async () => {
    render(<ImagingStudyForm patientId="p1" />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText(/obligatorios/i)).toBeInTheDocument();
    });
  });
});
