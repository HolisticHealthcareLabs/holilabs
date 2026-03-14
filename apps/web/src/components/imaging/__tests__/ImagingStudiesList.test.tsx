/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import ImagingStudiesList from '../ImagingStudiesList';

const mockStudy = {
  id: 'study-1',
  studyInstanceUID: '1.2.3',
  accessionNumber: 'ACC001',
  modality: 'CT',
  bodyPart: 'Chest',
  description: 'CT Chest AP',
  indication: null,
  status: 'COMPLETED' as const,
  orderingDoctor: 'Dr. Smith',
  referringDoctor: null,
  performingFacility: null,
  imageCount: 5,
  imageUrls: [],
  thumbnailUrl: null,
  reportUrl: null,
  findings: 'Normal',
  impression: 'No abnormality',
  isAbnormal: false,
  scheduledDate: null,
  studyDate: '2024-01-15T10:00:00.000Z',
  reportDate: null,
  reviewedDate: null,
  technician: null,
  radiologist: 'Dr. Rad',
  notes: null,
};

describe('ImagingStudiesList', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any);
  });

  it('shows loading spinner initially', () => {
    render(<ImagingStudiesList patientId="p1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no studies returned', async () => {
    render(<ImagingStudiesList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron estudios/i)).toBeInTheDocument();
    });
  });

  it('renders study cards after fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [mockStudy] }),
    } as any);
    render(<ImagingStudiesList patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText('CT Chest AP')).toBeInTheDocument();
    });
  });
});
