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

import { MARSheet } from '../MARSheet';

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ administrations: [], groupedByMedication: {} }),
  } as any);
});

describe('MARSheet', () => {
  it('shows loading spinner initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<MARSheet patientId="p1" />);
    expect(screen.getByText(/Loading MAR/i)).toBeInTheDocument();
  });

  it('renders the MAR header after load', async () => {
    render(<MARSheet patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByText(/Medication Administration Record/i)).toBeInTheDocument();
    });
  });

  it('renders shift selector buttons', async () => {
    render(<MARSheet patientId="p1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Day/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Evening/i })).toBeInTheDocument();
    });
  });
});
