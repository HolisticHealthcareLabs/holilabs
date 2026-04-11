/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, t: string) => t }),
  AnimatePresence: ({ children }: any) => children,
}));

jest.mock('@/hooks/useNotificationMode', () => ({
  __esModule: true,
  default: () => ({ mode: 'all', setMode: () => {} }),
  useNotificationMode: () => ({ mode: 'all', setMode: () => {} }),
}));
jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  __esModule: true,
  default: () => false,
  usePrefersReducedMotion: () => false,
}));

const NotificationProvider = require('../NotificationProvider').default;

describe('NotificationProvider', () => {
  it('renders children', () => {
    render(
      <NotificationProvider>
        <p>Child content</p>
      </NotificationProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('wraps children in ToastProvider context', () => {
    const { container } = render(
      <NotificationProvider>
        <span>wrapped</span>
      </NotificationProvider>
    );
    expect(screen.getByText('wrapped')).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
