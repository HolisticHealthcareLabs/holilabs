/** @jest-environment jsdom */
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('@/lib/auth/AuthProvider', () => ({ AuthProvider: ({ children }: any) => <>{children}</> }));
jest.mock('@/components/portal/PatientNavigation', () => ({ __esModule: true, default: () => <nav data-testid="patient-nav" /> }));
jest.mock('@/components/OfflineDetector', () => ({ OfflineDetector: () => null }));
jest.mock('@/components/portal/PatientPortalWrapper', () => ({ __esModule: true, default: ({ children }: any) => <>{children}</> }));
jest.mock('@/hooks/useNotifications', () => ({ useNotifications: () => ({ toasts: [], notifications: [], unreadCount: 0, dismissToast: jest.fn(), markAsRead: jest.fn(), markAllAsRead: jest.fn(), showToast: jest.fn() }) }));

import React from 'react';
import { render, screen } from '@testing-library/react';
import PortalLayoutWrapper from '../PortalLayoutWrapper';

describe('PortalLayoutWrapper', () => {
  it('renders children on regular portal pages', () => {
    render(
      <PortalLayoutWrapper>
        <div data-testid="page-content">Page</div>
      </PortalLayoutWrapper>
    );
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('renders navigation on non-auth routes', () => {
    render(
      <PortalLayoutWrapper>
        <div />
      </PortalLayoutWrapper>
    );
    expect(screen.getByTestId('patient-nav')).toBeInTheDocument();
  });
});
