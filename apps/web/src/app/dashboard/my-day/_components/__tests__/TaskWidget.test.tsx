/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('a', { href, ...rest }, children),
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      allCaughtUp: 'All caught up!',
      noTasksDesc: 'Nothing pending right now.',
      unsignedNotes: 'Unsigned Notes',
      sendReminder: 'Send a reminder to providers',
      nudgeProvider: 'Nudge Provider',
      sent: 'Sent',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/app/actions/schedule', () => ({
  nudgeProvider: jest.fn().mockResolvedValue({ success: true }),
}));

const { TaskWidget } = require('../TaskWidget');

import type { TaskItem } from '../TaskWidget';

const mockTasks: TaskItem[] = [
  {
    id: 'task-1',
    label: 'Unsigned Notes',
    count: 3,
    icon: 'signature',
    urgency: 'high',
    href: '/dashboard/notes',
  },
  {
    id: 'task-2',
    label: 'Pending Lab Results',
    count: 2,
    icon: 'lab',
    urgency: 'medium',
    href: '/dashboard/labs',
  },
];

describe('TaskWidget', () => {
  it('renders without crashing', () => {
    render(<TaskWidget tasks={[]} />);
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });

  it('shows empty state when tasks array is empty', () => {
    render(<TaskWidget tasks={[]} />);
    expect(screen.getByText('Nothing pending right now.')).toBeInTheDocument();
  });

  it('renders task labels and counts', () => {
    render(<TaskWidget tasks={mockTasks} />);
    expect(screen.getByText('Pending Lab Results')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders signature task as a button for admin role', () => {
    render(<TaskWidget tasks={mockTasks} userRole="ADMIN" />);
    // For admin role, the signature task renders as a clickable button (not a link)
    const buttons = screen.getAllByRole('button');
    const signatureButton = buttons.find((b) => b.textContent?.includes('Unsigned Notes'));
    expect(signatureButton).toBeDefined();
  });
});
