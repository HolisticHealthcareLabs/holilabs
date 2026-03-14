/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

const { SmartNotifications } = require('../SmartNotifications');

describe('SmartNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Notifications heading', () => {
    render(<SmartNotifications />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows loading state before mock data resolves', () => {
    render(<SmartNotifications />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows filter tabs after notifications load', () => {
    render(<SmartNotifications />);
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^unread$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^critical$/i })).toBeInTheDocument();
  });
});
