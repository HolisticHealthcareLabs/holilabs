/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import VersionHistory from '../VersionHistory';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('VersionHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading spinner initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<VersionHistory templateId="tmpl-1" />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no versions', async () => {
    mockFetch.mockResolvedValue({ json: async () => ({ success: true, data: { versions: [], templateName: 'Test' } }) });
    render(<VersionHistory templateId="tmpl-1" />);
    await waitFor(() => expect(screen.getByText(/No hay versiones guardadas/i)).toBeInTheDocument());
  });

  it('renders version items after load', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({
        success: true,
        data: {
          templateName: 'Test Template',
          versions: [{ id: 'v1', versionNumber: 1, versionLabel: null, changeLog: 'Initial', changedFields: [], createdBy: { id: 'u1', name: 'Dr. Smith', email: null }, createdAt: '2024-01-01T00:00:00Z' }],
        },
      }),
    });
    render(<VersionHistory templateId="tmpl-1" />);
    await waitFor(() => expect(screen.getByText(/Versión 1/i)).toBeInTheDocument());
  });
});
