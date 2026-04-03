/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (key === 'bell' && params?.count) return `${params.count} notifications`;
    return key;
  },
}));

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 401,
    json: () => Promise.resolve({}),
  }) as jest.Mock;
  (global as any).EventSource = jest.fn().mockImplementation(() => ({
    onmessage: null,
    onerror: null,
    close: () => {},
  }));
});

const NotificationCenter = require('../NotificationCenter').default;

describe('NotificationCenter', () => {
  it('renders the bell icon button', () => {
    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens panel when bell button is clicked', () => {
    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows empty state in panel when no notifications', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });
});
