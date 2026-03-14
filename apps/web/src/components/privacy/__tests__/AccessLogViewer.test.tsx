/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AccessLogViewer } from '../AccessLogViewer';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AccessLogViewer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<AccessLogViewer patientId="pat-1" />);
    expect(screen.getByText(/Loading access log/i)).toBeInTheDocument();
  });

  it('shows empty state when no logs', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: [], pagination: { totalPages: 1 } }) });
    render(<AccessLogViewer patientId="pat-1" />);
    await waitFor(() => expect(screen.getByText(/No access records found/i)).toBeInTheDocument());
  });

  it('renders log entries in table', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        data: [{ id: 'log-1', timestamp: '2024-01-15T10:00:00Z', accessedBy: 'Dr. Smith', role: 'Clinician', action: 'VIEW_RECORD' }],
        pagination: { totalPages: 1 },
      }),
    });
    render(<AccessLogViewer patientId="pat-1" />);
    await waitFor(() => expect(screen.getByText('Dr. Smith')).toBeInTheDocument());
    expect(screen.getByText('Clinician')).toBeInTheDocument();
  });
});
