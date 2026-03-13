/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
  },
  AnimatePresence: ({ children }: any) => children,
}));

const NotificationToast = require('../NotificationToast').default;

const mockToasts = [
  {
    id: 't1',
    type: 'success' as const,
    title: 'Appointment Confirmed',
    message: 'Your appointment has been confirmed.',
  },
];

describe('NotificationToast', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <NotificationToast toasts={mockToasts} onDismiss={jest.fn()} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays toast title and message', () => {
    render(<NotificationToast toasts={mockToasts} onDismiss={jest.fn()} />);
    expect(screen.getByText('Appointment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Your appointment has been confirmed.')).toBeInTheDocument();
  });

  it('renders empty when no toasts', () => {
    const { container } = render(
      <NotificationToast toasts={[]} onDismiss={jest.fn()} />
    );
    expect(container).toBeTruthy();
  });
});
