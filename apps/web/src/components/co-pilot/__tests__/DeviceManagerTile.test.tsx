/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('../CommandCenterTile', () => ({
  __esModule: true,
  default: ({ children, title, subtitle }: any) => <div data-testid="tile"><h3>{title}</h3><p>{subtitle}</p>{children}</div>,
}));

const mockGetAllDevices = jest.fn().mockReturnValue([]);
const mockGetDevicePermissions = jest.fn().mockReturnValue([]);
const mockRevokeAllPermissions = jest.fn();
const mockUpdateDevicePermissions = jest.fn();

jest.mock('@/lib/qr/permission-manager', () => {
  return {
    __esModule: true,
    permissionManager: {
      get getAllDevices() { return mockGetAllDevices; },
      get getDevicePermissions() { return mockGetDevicePermissions; },
      get revokeAllPermissions() { return mockRevokeAllPermissions; },
      get updateDevicePermissions() { return mockUpdateDevicePermissions; },
    },
  };
});

jest.mock('@/lib/qr/types', () => ({ __esModule: true }));

import DeviceManagerTile from '../DeviceManagerTile';

describe('DeviceManagerTile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllDevices.mockReturnValue([]);
  });

  it('renders tile title', () => {
    render(<DeviceManagerTile />);
    expect(screen.getByText('Connected Devices')).toBeInTheDocument();
  });

  it('renders empty state when no devices', () => {
    render(<DeviceManagerTile />);
    expect(screen.getByText('No connected devices')).toBeInTheDocument();
  });
});
