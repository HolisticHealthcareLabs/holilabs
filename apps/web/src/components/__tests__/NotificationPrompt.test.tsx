/** @jest-environment jsdom */
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@/lib/push-notifications', () => ({
  pushNotifications: {
    isSupported: jest.fn(() => true),
    getPermission: jest.fn(() => 'default'),
    requestPermission: jest.fn(() => Promise.resolve('granted')),
    init: jest.fn(() => Promise.resolve()),
    subscribe: jest.fn(() => Promise.resolve()),
    showNotification: jest.fn(() => Promise.resolve()),
  },
}));

import NotificationPrompt from '../NotificationPrompt';

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  localStorage.clear();
});
afterEach(() => jest.useRealTimers());

describe('NotificationPrompt', () => {
  it('renders nothing before the 5-second delay', () => {
    render(<NotificationPrompt />);
    expect(screen.queryByText('Enable Notifications?')).not.toBeInTheDocument();
  });

  it('shows prompt after 5 seconds when permission is default and not dismissed', () => {
    render(<NotificationPrompt />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.getByText('Enable Notifications?')).toBeInTheDocument();
  });

  it('dismisses prompt and stores dismissal flag when "No, thanks" is clicked', () => {
    render(<NotificationPrompt />);
    act(() => { jest.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByText('No, thanks'));
    expect(screen.queryByText('Enable Notifications?')).not.toBeInTheDocument();
    expect(localStorage.getItem('notificationPromptDismissed')).toBe('true');
  });
});
