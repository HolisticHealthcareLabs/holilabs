/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mocks must be before any imports that use them
jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, t: string) => t }),
  AnimatePresence: ({ children }: any) => children
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (k: string) => k
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...p }: any) => <a {...p}>{children}</a>
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/'
}));

jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'en', t: (k: string) => k })
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toasts: [] })),
  toast: jest.fn(),
}));

jest.mock('@/components/ui/Toast', () => ({
  Toast: ({ children }: any) => <div data-testid="toast">{children}</div>,
  ToastClose: () => <button>×</button>,
  ToastDescription: ({ children }: any) => <p>{children}</p>,
  ToastProvider: ({ children }: any) => <div>{children}</div>,
  ToastTitle: ({ children }: any) => <strong>{children}</strong>,
  ToastViewport: () => <div data-testid="toast-viewport" />,
}));

import { Toaster } from '../toaster';
const { useToast } = require('@/hooks/use-toast');

describe('Toaster', () => {
  beforeEach(() => {
    useToast.mockClear();
    useToast.mockReturnValue({ toasts: [] });
  });

  it('renders without any toasts', () => {
    render(<Toaster />);
    expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
  });

  it('renders toast items when toasts are present', () => {
    useToast.mockReturnValue({
      toasts: [
        { id: '1', title: 'Test Notification', description: 'This is a test' },
      ],
    });
    render(<Toaster />);
    expect(screen.getByText('Test Notification')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    useToast.mockReturnValue({
      toasts: [
        { id: '1', title: 'Toast 1' },
        { id: '2', title: 'Toast 2' },
      ],
    });
    render(<Toaster />);
    expect(screen.getAllByTestId('toast')).toHaveLength(2);
  });
});
