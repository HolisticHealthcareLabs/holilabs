/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PreventionPlanHistory from '../PreventionPlanHistory';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockHistoryData = {
  plan: { id: 'plan-1', planName: 'Wellness Plan', planType: 'WELLNESS', status: 'ACTIVE', createdAt: '2024-01-01', updatedAt: '2024-06-01' },
  versions: [],
  timeline: [],
  screeningCompliance: { totalScheduled: 5, completed: 3, overdue: 1, upcoming: 1, complianceRate: 60 },
};

describe('PreventionPlanHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading spinner initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<PreventionPlanHistory patientId="pat-1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows plan name after successful fetch', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: mockHistoryData }) });
    render(<PreventionPlanHistory patientId="pat-1" />);
    await waitFor(() => expect(screen.getByText('Wellness Plan')).toBeInTheDocument());
  });

  it('toggles to versions view', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: mockHistoryData }) });
    render(<PreventionPlanHistory patientId="pat-1" />);
    await waitFor(() => screen.getByText(/Versions/));
    fireEvent.click(screen.getByText(/Versions/));
    expect(screen.getByText(/No version history available/i)).toBeInTheDocument();
  });
});
