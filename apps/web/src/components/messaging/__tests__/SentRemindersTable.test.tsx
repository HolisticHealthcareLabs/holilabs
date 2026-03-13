/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const SentRemindersTable = require('../SentRemindersTable').default;

describe('SentRemindersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<SentRemindersTable />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no reminders returned', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) })
    ) as jest.Mock;
    render(<SentRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText(/No sent reminders yet/)).toBeInTheDocument();
    });
  });

  it('renders reminder cards with data', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'rem-1',
                templateName: 'Appointment Reminder',
                recipient: { id: 'p1', name: 'Maria Silva', contact: '+55 11 99999-9999' },
                channel: 'SMS',
                message: 'Your appointment is tomorrow.',
                sentAt: '2025-06-01T10:00:00Z',
                status: 'SENT',
              },
            ],
          }),
      })
    ) as jest.Mock;
    render(<SentRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText('Appointment Reminder')).toBeInTheDocument();
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    });
  });

  it('shows message content when View message is clicked', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'rem-2',
                templateName: 'Follow-Up',
                recipient: { id: 'p2', name: 'João Costa', contact: 'joao@example.com' },
                channel: 'EMAIL',
                message: 'Please schedule your follow-up.',
                sentAt: '2025-06-02T09:00:00Z',
                status: 'SENT',
              },
            ],
          }),
      })
    ) as jest.Mock;
    render(<SentRemindersTable />);
    await waitFor(() => screen.getByText('View message →'));
    fireEvent.click(screen.getByText('View message →'));
    expect(screen.getByText('Please schedule your follow-up.')).toBeInTheDocument();
  });
});
