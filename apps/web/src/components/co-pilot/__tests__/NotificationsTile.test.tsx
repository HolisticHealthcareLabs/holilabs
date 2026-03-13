/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@heroicons/react/24/outline', () => ({
  BellIcon: () => <div data-testid="bell-icon" />,
  ExclamationTriangleIcon: () => <div data-testid="exclamation-icon" />,
  InformationCircleIcon: () => <div data-testid="info-icon" />,
  CheckCircleIcon: () => <div data-testid="check-icon" />,
  XMarkIcon: () => <div data-testid="x-icon" />,
}));

jest.mock('../CommandCenterTile', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="tile-wrapper">{children}</div>,
}));

const NotificationsTile = require('../NotificationsTile').default;

describe('NotificationsTile', () => {
  it('renders without crashing with empty initial notifications', () => {
    const { container } = render(<NotificationsTile initialNotifications={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with provided initial notifications', () => {
    const notifications = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Test Alert',
        message: 'Test message',
        timestamp: new Date(),
        read: false,
      },
    ];
    render(<NotificationsTile initialNotifications={notifications} />);
    expect(screen.getByText('Test Alert')).toBeInTheDocument();
  });
});
