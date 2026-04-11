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

const FailedRemindersTable = require('../FailedRemindersTable').default;

const mockFailedReminder = {
  id: 'fail-1',
  templateName: 'Post-Op Reminder',
  patientIds: ['p1', 'p2', 'p3'],
  channel: 'SMS' as const,
  scheduledFor: '2025-06-01T08:00:00Z',
  status: 'FAILED' as const,
  lastExecutionResults: {
    success: false,
    sent: 1,
    failed: 2,
    errors: ['Invalid phone number', 'Carrier rejected'],
  },
  updatedAt: '2025-06-01T08:05:00Z',
};

describe('FailedRemindersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<FailedRemindersTable />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no failed reminders', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) })
    ) as jest.Mock;
    render(<FailedRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText(/No failed reminders/)).toBeInTheDocument();
    });
  });

  it('renders failed reminder with retry button', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [mockFailedReminder] }),
      })
    ) as jest.Mock;
    render(<FailedRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText('Post-Op Reminder')).toBeInTheDocument();
      expect(screen.getByText('3 recipients')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('shows inline error details for failed reminders', async () => {
    global.fetch = (() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [mockFailedReminder] }),
      })
    ) as any;
    render(<FailedRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText('Post-Op Reminder')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Invalid phone number/).length).toBeGreaterThan(0);
  });
});
