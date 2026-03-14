/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));

const PatientRowActions = require('../PatientRowActions').default;

describe('PatientRowActions', () => {
  it('renders the trigger button with accessible label', () => {
    render(<PatientRowActions patientId="p1" patientName="Jane Doe" />);
    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument();
  });

  it('opens dropdown and shows patient name and action items', () => {
    render(<PatientRowActions patientId="p1" patientName="Jane Doe" />);
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Schedule Appointment')).toBeInTheDocument();
    expect(screen.getByText('View Chart')).toBeInTheDocument();
  });

  it('calls onAction with the action id and patientId', () => {
    const onAction = jest.fn();
    render(<PatientRowActions patientId="p1" patientName="Jane Doe" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    fireEvent.click(screen.getByText('Send Message'));
    expect(onAction).toHaveBeenCalledWith('message', 'p1');
  });
});
