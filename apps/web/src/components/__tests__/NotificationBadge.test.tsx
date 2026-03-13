/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@heroicons/react/24/outline', () => ({
  BellIcon: () => <svg data-testid="bell-icon" />,
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.useFakeTimers();
  mockFetch.mockResolvedValue({
    json: async () => ({ success: true, data: { unreadCount: 0 } }),
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

const { NotificationBadge } = require('../NotificationBadge');

describe('NotificationBadge', () => {
  it('renders bell icon button', async () => {
    await act(async () => {
      render(<NotificationBadge />);
    });
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows badge count when unread notifications exist', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ success: true, data: { unreadCount: 5 } }),
    });
    await act(async () => {
      render(<NotificationBadge />);
    });
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('caps display at 99+ for large counts', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ success: true, data: { unreadCount: 150 } }),
    });
    await act(async () => {
      render(<NotificationBadge />);
    });
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
