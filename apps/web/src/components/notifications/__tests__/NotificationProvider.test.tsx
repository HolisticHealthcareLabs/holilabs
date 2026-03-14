/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    toasts: [],
    notifications: [],
    unreadCount: 0,
    dismissToast: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  }),
}));
jest.mock('../NotificationToast', () => ({ __esModule: true, default: () => null }));
jest.mock('../NotificationBell', () => ({
  __esModule: true,
  default: () => <div data-testid="notification-bell" />,
}));

const NotificationProvider = require('../NotificationProvider').default;

describe('NotificationProvider', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders children', () => {
    render(
      <NotificationProvider userId="u1" userType="CLINICIAN">
        <p>Child content</p>
      </NotificationProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders notification bell by default', () => {
    render(
      <NotificationProvider userId="u1" userType="CLINICIAN">
        <span />
      </NotificationProvider>
    );
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('hides notification bell when showBell is false', () => {
    render(
      <NotificationProvider userId="u1" userType="CLINICIAN" showBell={false}>
        <span />
      </NotificationProvider>
    );
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
  });
});
