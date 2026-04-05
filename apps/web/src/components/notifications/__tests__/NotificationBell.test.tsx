/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (key === 'bell' && params?.count) return `${params.count} notifications`;
    return key;
  },
}));

import { NotificationBell } from '../NotificationBell';

describe('NotificationBell', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <NotificationBell unreadCount={0} isOpen={false} onClick={() => {}} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('shows unread count badge', () => {
    render(
      <NotificationBell unreadCount={3} isOpen={false} onClick={() => {}} />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const handleClick = jest.fn();
    render(
      <NotificationBell unreadCount={0} isOpen={false} onClick={handleClick} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
