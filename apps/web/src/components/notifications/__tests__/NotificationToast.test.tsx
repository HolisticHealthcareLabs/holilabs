/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_, tag: string) => {
      return React.forwardRef((props: any, ref: any) => React.createElement(tag, { ...props, ref }));
    },
  }),
  AnimatePresence: ({ children }: any) => children,
}));

jest.mock('@/hooks/useNotificationMode', () => ({
  __esModule: true,
  default: () => ({ mode: 'active', setMode: () => {} }),
  useNotificationMode: () => 'active',
}));
jest.mock('@/hooks/usePrefersReducedMotion', () => ({
  __esModule: true,
  default: () => false,
  usePrefersReducedMotion: () => false,
}));

import { ToastProvider, useToast } from '../NotificationToast';

function ToastTrigger({ message }: { message: string }) {
  const toast = useToast();
  return <button onClick={() => toast.success(message)}>Show Toast</button>;
}

describe('NotificationToast (ToastProvider)', () => {
  it('renders children without crashing', () => {
    const { container } = render(
      <ToastProvider>
        <p>child</p>
      </ToastProvider>
    );
    expect(container).toBeTruthy();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('provides useToast context to children', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Test toast" />
      </ToastProvider>
    );
    expect(screen.getByRole('button', { name: 'Show Toast' })).toBeInTheDocument();
  });

  it('renders empty when no toasts have been triggered', () => {
    const { container } = render(
      <ToastProvider>
        <span>empty</span>
      </ToastProvider>
    );
    expect(screen.getByText('empty')).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
