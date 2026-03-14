/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { EnhancedClinicalDecisionSupport } from '../EnhancedClinicalDecisionSupport';

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ alerts: [], summary: null }),
  });
});

describe('EnhancedClinicalDecisionSupport', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<EnhancedClinicalDecisionSupport patientId="p1" />);
    expect(screen.getByText('Loading clinical alerts...')).toBeInTheDocument();
  });

  it('shows empty state when no alerts returned', async () => {
    render(<EnhancedClinicalDecisionSupport patientId="p1" />);
    await waitFor(() => expect(screen.getByText('No Active Clinical Alerts')).toBeInTheDocument());
  });

  it('renders alert list when alerts are returned', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        alerts: [{
          id: 'a1', type: 'warning', category: 'drug_interaction',
          title: 'Drug Alert', message: 'Check interaction', priority: 'medium',
          actionRequired: false, dismissible: true, source: 'system', timestamp: new Date(),
        }],
        summary: { critical: 0, warnings: 1, info: 0, byCategory: {} },
      }),
    });
    render(<EnhancedClinicalDecisionSupport patientId="p1" />);
    await waitFor(() => expect(screen.getByText('Drug Alert')).toBeInTheDocument());
  });
});
