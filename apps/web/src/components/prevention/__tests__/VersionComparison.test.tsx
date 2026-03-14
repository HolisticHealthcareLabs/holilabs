/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VersionComparison from '../VersionComparison';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockComparison = {
  templateId: 'tmpl-1',
  version1: { id: 'v1', versionNumber: 1, versionLabel: null, createdAt: '2024-01-01T00:00:00Z', createdBy: { id: 'u1', name: 'Dr. Smith', email: null } },
  version2: { id: 'v2', versionNumber: 2, versionLabel: null, createdAt: '2024-02-01T00:00:00Z', createdBy: { id: 'u1', name: 'Dr. Smith', email: null } },
  differences: [{ field: 'templateName', oldValue: 'Old Name', newValue: 'New Name', changed: true }],
  changedFields: ['templateName'],
  summary: { totalFields: 5, changedFields: 1, unchangedFields: 4 },
};

describe('VersionComparison', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading spinner while fetching', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<VersionComparison templateId="tmpl-1" versionId1="v1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: false, error: 'Not found' }) });
    render(<VersionComparison templateId="tmpl-1" versionId1="v1" />);
    await waitFor(() => expect(screen.getByText(/Reintentar/i)).toBeInTheDocument());
  });

  it('renders comparison data after load', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: mockComparison }) });
    render(<VersionComparison templateId="tmpl-1" versionId1="v1" versionId2="v2" />);
    await waitFor(() => expect(screen.getByText(/Comparación de Versiones/i)).toBeInTheDocument());
  });
});
