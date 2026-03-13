/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('date-fns', () => ({
  format: (date: any, fmt: string) => '2025-01-15 10:00',
  differenceInHours: () => 2,
}));
jest.mock('date-fns/locale', () => ({
  es: {},
}));
jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: (props: any) => <svg data-testid="check-icon" {...props} />,
  XCircleIcon: (props: any) => <svg data-testid="x-icon" {...props} />,
  ClockIcon: (props: any) => <svg data-testid="clock-icon" {...props} />,
  CalendarIcon: (props: any) => <svg data-testid="calendar-icon" {...props} />,
  UserIcon: (props: any) => <svg data-testid="user-icon" {...props} />,
  ArrowRightIcon: (props: any) => <svg data-testid="arrow-icon" {...props} />,
}));

const RescheduleApprovalCard = require('../RescheduleApprovalCard').default || require('../RescheduleApprovalCard').RescheduleApprovalCard;

const mockAppointment = {
  id: 'apt-1',
  title: 'General Consultation',
  startTime: new Date('2025-01-15T10:00:00'),
  endTime: new Date('2025-01-15T11:00:00'),
  rescheduleNewTime: new Date('2025-01-16T14:00:00'),
  rescheduleReason: 'Conflict with another appointment',
  rescheduleRequestedAt: new Date('2025-01-14T08:00:00'),
  patient: {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: 'john@test.com',
  },
  clinician: {
    firstName: 'Dr.',
    lastName: 'Smith',
  },
};

describe('RescheduleApprovalCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <RescheduleApprovalCard
        appointment={mockAppointment}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
        onCounterPropose={jest.fn()}
      />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
