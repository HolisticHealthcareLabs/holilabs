/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '5 minutes ago',
}));

const NotificationBell = require('../NotificationBell').default;

const mockNotifications = [
  {
    id: 'n1',
    type: 'appointment' as const,
    title: 'New Appointment',
    message: 'Patient scheduled for tomorrow',
    read: false,
    createdAt: new Date(),
  },
];

describe('NotificationBell', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <NotificationBell
        notifications={[]}
        unreadCount={0}
        onMarkAsRead={jest.fn()}
        onMarkAllAsRead={jest.fn()}
      />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows unread count badge', () => {
    render(
      <NotificationBell
        notifications={mockNotifications}
        unreadCount={3}
        onMarkAsRead={jest.fn()}
        onMarkAllAsRead={jest.fn()}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
