/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'user-1', role: 'CLINICIAN' } } }),
}));

jest.mock('@/hooks/useRealtimePreventionUpdates', () => ({
  useRealtimePreventionUpdates: () => ({ connected: false, socketId: null }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    showToast: jest.fn(),
    dismissToast: jest.fn(),
    toasts: [],
  }),
}));

jest.mock('@/components/notifications/NotificationToast', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/lib/socket/events', () => ({
  SocketEvent: {
    PLAN_CREATED: 'plan:created',
    PLAN_UPDATED: 'plan:updated',
    PLAN_DELETED: 'plan:deleted',
    PLAN_STATUS_CHANGED: 'plan:status_changed',
    TEMPLATE_CREATED: 'template:created',
    TEMPLATE_UPDATED: 'template:updated',
    TEMPLATE_DELETED: 'template:deleted',
    TEMPLATE_USED: 'template:used',
    TEMPLATE_ACTIVATED: 'template:activated',
    TEMPLATE_DEACTIVATED: 'template:deactivated',
    GOAL_ADDED: 'goal:added',
    GOAL_UPDATED: 'goal:updated',
    GOAL_COMPLETED: 'goal:completed',
    COMMENT_ADDED: 'comment:added',
    REMINDER_CREATED: 'reminder:created',
    BULK_OPERATION_COMPLETED: 'bulk:completed',
  },
  NotificationPriority: { HIGH: 'HIGH', URGENT: 'URGENT', NORMAL: 'NORMAL' },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import PreventionNotificationProvider from '../PreventionNotificationProvider';

describe('PreventionNotificationProvider', () => {
  it('renders children', () => {
    render(
      <PreventionNotificationProvider>
        <div data-testid="child">Child Content</div>
      </PreventionNotificationProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders children with showToasts=false', () => {
    render(
      <PreventionNotificationProvider showToasts={false}>
        <span data-testid="inner">Inner</span>
      </PreventionNotificationProvider>
    );
    expect(screen.getByTestId('inner')).toBeInTheDocument();
  });

  it('renders children with autoConnect=false', () => {
    render(
      <PreventionNotificationProvider autoConnect={false}>
        <div>No Connect</div>
      </PreventionNotificationProvider>
    );
    expect(screen.getByText('No Connect')).toBeInTheDocument();
  });
});
