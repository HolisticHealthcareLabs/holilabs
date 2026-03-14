/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/solid', () => new Proxy({}, { get: () => () => null }));

const { PriorityPatientsWidget } = require('../PriorityPatientsWidget');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PriorityPatientsWidget', () => {
  it('shows the loading spinner on initial render', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    render(<PriorityPatientsWidget />);
    expect(screen.getByText(/loading priority patients/i)).toBeInTheDocument();
  });

  it('shows error state when fetch fails', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
    ) as jest.Mock;
    render(<PriorityPatientsWidget />);
    await waitFor(() =>
      expect(screen.getByText(/failed to load priority patients/i)).toBeInTheDocument()
    );
  });

  it('shows empty-state message when no priority patients exist', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], summary: null }),
      })
    ) as jest.Mock;
    render(<PriorityPatientsWidget />);
    await waitFor(() =>
      expect(screen.getByText(/no priority patients/i)).toBeInTheDocument()
    );
  });
});
