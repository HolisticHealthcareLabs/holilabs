/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
}));
jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

const { SmartAlerts } = require('../SmartAlerts');

const makeAlert = (overrides: any) => ({
  id: 'al1',
  title: 'Overdue Screening',
  description: 'Patient is overdue for colorectal cancer screening.',
  severity: 'warning' as const,
  source: 'USPSTF 2022',
  action: { type: 'order', label: 'Order Colonoscopy' },
  ...overrides,
});

describe('SmartAlerts', () => {
  it('renders null when no initial alerts are provided', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    const { container } = render(<SmartAlerts patientId="p1" initialAlerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the alert banner when alerts are provided', () => {
    const alerts = [makeAlert({ id: 'al1', severity: 'warning' })];
    render(<SmartAlerts patientId="p1" initialAlerts={alerts} />);
    expect(screen.getByText(/alerts \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Overdue Screening')).toBeInTheDocument();
  });

  it('hides an alert when the Dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    const alerts = [makeAlert({ id: 'al1' })];
    render(<SmartAlerts patientId="p1" initialAlerts={alerts} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledWith('al1');
    expect(screen.queryByText('Overdue Screening')).not.toBeInTheDocument();
  });
});
