/**
 * @jest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { GlobalSearch } from '@/components/search/GlobalSearch';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

type FetchResponse = Readonly<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

function mockFetchOnce(data: unknown): FetchResponse {
  return {
    ok: true,
    json: async () => data,
  };
}

describe('GlobalSearch debounce', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn(async () =>
      mockFetchOnce({ patients: [], query: 'xx', count: 0 })
    ) as unknown as typeof fetch;
    // Silence localStorage access in jsdom tests when needed
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => undefined),
      },
      writable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('debounces search calls and uses the latest query', async () => {
    render(<GlobalSearch />);

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /search patients/i }));

    const input = screen.getByPlaceholderText(/search by name/i);

    // Type quickly: should only call fetch once after debounce window
    fireEvent.change(input, { target: { value: 'ma' } });
    fireEvent.change(input, { target: { value: 'mar' } });

    expect(global.fetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(global.fetch).toHaveBeenCalledTimes(0);

    await act(async () => {
      jest.advanceTimersByTime(2);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('/api/search/patients?q=');
    expect(url).toContain(encodeURIComponent('mar'));
  });
});


