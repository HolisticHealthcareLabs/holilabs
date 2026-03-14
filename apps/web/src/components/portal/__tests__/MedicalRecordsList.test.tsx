/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('date-fns', () => ({ format: (_: any, fmt: string) => '01 ene 2024' }));
jest.mock('date-fns/locale', () => ({ es: {} }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import MedicalRecordsList from '../MedicalRecordsList';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('MedicalRecordsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading skeleton on mount', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<MedicalRecordsList />);
    // Loading skeletons use animate-pulse
    const pulseEls = document.querySelectorAll('.animate-pulse');
    expect(pulseEls.length).toBeGreaterThan(0);
  });

  it('shows error state with retry button', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ success: false, error: 'Server error' }) });
    render(<MedicalRecordsList />);
    await waitFor(() => expect(screen.getByText(/Reintentar/i)).toBeInTheDocument());
  });

  it('shows empty state when no records found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { records: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false } } }),
    });
    render(<MedicalRecordsList />);
    await waitFor(() => expect(screen.getByText(/no se encontraron registros/i)).toBeInTheDocument());
  });
});
