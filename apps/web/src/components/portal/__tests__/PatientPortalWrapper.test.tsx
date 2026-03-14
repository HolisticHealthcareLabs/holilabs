/** @jest-environment jsdom */
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    toasts: [],
    notifications: [],
    unreadCount: 0,
    dismissToast: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    showToast: jest.fn(),
  }),
}));
jest.mock('@/components/notifications/NotificationToast', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/notifications/NotificationBell', () => ({ __esModule: true, default: () => <div data-testid="notification-bell" /> }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import PatientPortalWrapper from '../PatientPortalWrapper';

describe('PatientPortalWrapper', () => {
  it('renders children', async () => {
    render(
      <PatientPortalWrapper>
        <div data-testid="child-content">Hello</div>
      </PatientPortalWrapper>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('shows notification bell when patientId provided', async () => {
    render(
      <PatientPortalWrapper patientId="patient-123">
        <div />
      </PatientPortalWrapper>
    );
    // After mount, notification bell should appear
    await new Promise(r => setTimeout(r, 0));
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('does not show notification bell without patientId', async () => {
    render(
      <PatientPortalWrapper>
        <div />
      </PatientPortalWrapper>
    );
    await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByTestId('notification-bell')).toBeNull();
  });
});
