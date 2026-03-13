/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}));

// useOptimistic is React 19+ — provide a fallback shim for the React 18 test environment
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useOptimistic: (state: unknown) => [state, jest.fn()],
  };
});

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`;
    const map: Record<string, string> = {
      filterAll: 'All',
      filterArrived: 'Arrived',
      filterScheduled: 'Scheduled',
      filterToSign: 'To Sign',
      filterCompleted: 'Completed',
      scheduleIsClear: 'Schedule is clear',
      noAppointmentsToday: 'No appointments today',
      noFilterPatients: 'No patients',
      tryAnotherFilter: 'Try another filter',
      scheduled: 'Scheduled',
      arrived: 'Arrived',
      inProgress: 'In Progress',
      finished: 'Finished',
      pendingSignature: 'Pending Signature',
      beginVisit: 'Begin Visit',
    };
    return map[key] ?? key;
  },
}));

jest.mock('@/app/actions/schedule', () => ({
  updateAppointmentStatus: jest.fn().mockResolvedValue(undefined),
}));

const { PatientQueue } = require('../PatientQueue');

const mockAppointments = [
  {
    id: 'apt-1',
    time: '09:00',
    patientName: 'Ana Lima',
    initials: 'AL',
    age: 35,
    sex: 'F',
    chiefComplaint: 'Headache',
    status: 'Arrived' as const,
  },
  {
    id: 'apt-2',
    time: '10:00',
    patientName: 'Carlos Mendes',
    initials: 'CM',
    age: 52,
    sex: 'M',
    chiefComplaint: 'Back pain',
    status: 'Scheduled' as const,
  },
];

describe('PatientQueue', () => {
  it('renders without crashing', () => {
    render(<PatientQueue appointments={[]} />);
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  it('shows empty state when no appointments', () => {
    render(<PatientQueue appointments={[]} />);
    expect(screen.getByText('Schedule is clear')).toBeInTheDocument();
  });

  it('renders patient names from appointments', () => {
    render(<PatientQueue appointments={mockAppointments} />);
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument();
  });

  it('filters appointments by status tab', () => {
    render(<PatientQueue appointments={mockAppointments} />);
    // Click the Scheduled filter tab (multiple "Arrived" texts exist — tab + status badge)
    const scheduledButton = screen.getAllByRole('button').find(
      (b) => b.textContent?.startsWith('Scheduled')
    );
    expect(scheduledButton).toBeDefined();
    fireEvent.click(scheduledButton!);
    expect(screen.getByText('Carlos Mendes')).toBeInTheDocument();
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();
  });
});
