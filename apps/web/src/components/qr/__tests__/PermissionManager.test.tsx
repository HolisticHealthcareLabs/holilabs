/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/lib/qr/permission-manager', () => ({
  permissionManager: {
    getPairedDevices: jest.fn().mockReturnValue([]),
    revokeDevicePermissions: jest.fn(),
    getDevicePermissions: jest.fn().mockReturnValue([]),
    updateDevicePermissions: jest.fn(),
  },
}));

jest.mock('@/lib/qr/types', () => ({}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import PermissionManagerComponent from '../PermissionManager';

describe('PermissionManager', () => {
  it('renders the Permission Manager heading', () => {
    render(<PermissionManagerComponent />);
    expect(screen.getByText('Permission Manager')).toBeInTheDocument();
  });

  it('shows "No devices connected" when no devices are paired', () => {
    render(<PermissionManagerComponent />);
    expect(screen.getByText('No devices connected')).toBeInTheDocument();
  });

  it('shows device count', () => {
    render(<PermissionManagerComponent />);
    expect(screen.getByText(/0 device/)).toBeInTheDocument();
  });
});
