/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...p }: any) => <a href={href} {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/portal/dashboard' }));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/components/notifications/NotificationCenter', () => ({ __esModule: true, default: () => <div data-testid="notification-center" /> }));
jest.mock('@/components/search/GlobalSearch', () => ({ GlobalSearch: () => <div data-testid="global-search" /> }));
jest.mock('@/providers/ThemeProvider', () => ({ ThemeToggleIcon: () => <div data-testid="theme-toggle" /> }));

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PatientNavigation from '../PatientNavigation';

global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ patient: { firstName: 'Alice', lastName: 'Smith' } }) });

describe('PatientNavigation', () => {
  it('renders navigation items', async () => {
    render(<PatientNavigation />);
    await waitFor(() => expect(screen.getAllByText('home').length).toBeGreaterThan(0));
    expect(screen.getAllByText('appointments').length).toBeGreaterThan(0);
  });

  it('shows loading placeholder initially', () => {
    render(<PatientNavigation />);
    expect(screen.getAllByText('loading').length).toBeGreaterThan(0);
  });

  it('highlights active route', async () => {
    render(<PatientNavigation />);
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const dashboardLink = links.find(l => l.getAttribute('href') === '/portal/dashboard');
      expect(dashboardLink).toBeTruthy();
    });
  });
});
