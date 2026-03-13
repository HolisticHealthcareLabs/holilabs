/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const ScheduledRemindersTable = require('../ScheduledRemindersTable').default;

describe('ScheduledRemindersTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading skeletons initially', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;

    const { container } = render(<ScheduledRemindersTable />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no reminders returned', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as jest.Mock;

    render(<ScheduledRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText(/No scheduled reminders yet/)).toBeInTheDocument();
    });
  });

  it('renders reminder cards when data exists', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            success: true,
            data: [
              {
                id: 'rem-1',
                templateName: 'Appointment 24h',
                patientIds: ['p1', 'p2'],
                channel: 'SMS',
                scheduledFor: '2025-06-01T10:00:00Z',
                nextExecution: null,
                status: 'ACTIVE',
                recurrencePattern: null,
                recurrenceInterval: null,
                executionCount: 0,
              },
            ],
          }),
      })
    ) as jest.Mock;

    render(<ScheduledRemindersTable />);
    await waitFor(() => {
      expect(screen.getByText('Appointment 24h')).toBeInTheDocument();
      expect(screen.getByText('2 patients')).toBeInTheDocument();
    });
  });
});
