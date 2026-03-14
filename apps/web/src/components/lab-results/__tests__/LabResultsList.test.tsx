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

import LabResultsList from '../LabResultsList';

const mockResult = {
  id: 'lr-1',
  testName: 'Hemoglobin',
  testCode: '718-7',
  category: 'Hematology',
  value: '14.5',
  unit: 'g/dL',
  referenceRange: '12-16 g/dL',
  status: 'FINAL' as const,
  interpretation: 'Normal',
  isAbnormal: false,
  isCritical: false,
  orderingDoctor: 'Dr. Smith',
  performingLab: 'LabCorp',
  resultDate: '2024-01-15T10:00:00.000Z',
  reviewedDate: null,
  notes: null,
  attachmentUrl: null,
};

describe('LabResultsList', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any);
  });

  it('shows loading spinner initially', () => {
    render(<LabResultsList patientId="p1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no results', async () => {
    render(<LabResultsList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron resultados/i)).toBeInTheDocument();
    });
  });

  it('renders results in table after fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [mockResult] }),
    } as any);
    render(<LabResultsList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText('Hemoglobin')).toBeInTheDocument();
    });
  });
});
