/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/hooks/useRealtimePreventionUpdates', () => ({
  useRealtimePreventionUpdates: () => ({ connected: false }),
}));
jest.mock('@/lib/socket/events', () => ({}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ActivityFeed from '../ActivityFeed';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ActivityFeed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading spinner while fetching', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<ActivityFeed />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Failed' }) });
    render(<ActivityFeed />);
    await waitFor(() => expect(screen.getByText(/Error al cargar actividades/i)).toBeInTheDocument());
  });

  it('shows empty state when no activities', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { activities: [] } }) });
    render(<ActivityFeed />);
    await waitFor(() => expect(screen.getByText(/No hay actividad reciente/i)).toBeInTheDocument());
  });
});
