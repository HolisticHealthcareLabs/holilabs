/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const NotificationCenter = require('../NotificationCenter').default;

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    }) as jest.Mock;
    (global as any).EventSource = jest.fn().mockImplementation(() => ({
      onmessage: null,
      onerror: null,
      close: jest.fn(),
    }));
  });

  it('renders the bell icon button', () => {
    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('opens dropdown when bell button is clicked', () => {
    render(<NotificationCenter />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('shows empty state in dropdown when no notifications', () => {
    render(<NotificationCenter />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('No tienes notificaciones')).toBeInTheDocument();
  });
});
