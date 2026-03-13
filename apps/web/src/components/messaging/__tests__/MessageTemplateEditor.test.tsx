/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('isomorphic-dompurify', () => ({
  __esModule: true,
  default: { sanitize: (html: string) => html },
}));

jest.mock('../PatientSelectorModal', () => ({
  __esModule: true,
  default: () => <div data-testid="patient-selector-modal" />,
}));

jest.mock('../ScheduleReminderModal', () => ({
  __esModule: true,
  default: () => <div data-testid="schedule-reminder-modal" />,
}));

const MessageTemplateEditor = require('../MessageTemplateEditor').default;

describe('MessageTemplateEditor', () => {
  it('renders heading and create button', () => {
    render(<MessageTemplateEditor />);
    expect(screen.getByText('Message Templates')).toBeInTheDocument();
    expect(screen.getByText('+ New')).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    render(<MessageTemplateEditor />);
    expect(screen.getByText(/All Templates/)).toBeInTheDocument();
    expect(screen.getByText(/Appointments/)).toBeInTheDocument();
    expect(screen.getByText(/Medications/)).toBeInTheDocument();
  });

  it('renders default template names', () => {
    render(<MessageTemplateEditor />);
    expect(screen.getByText('Appointment Reminder (24h)')).toBeInTheDocument();
    expect(screen.getByText('Daily Medication Reminder')).toBeInTheDocument();
  });
});
