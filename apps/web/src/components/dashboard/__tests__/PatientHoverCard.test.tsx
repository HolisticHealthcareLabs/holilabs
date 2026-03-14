/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import PatientHoverCard from '../PatientHoverCard';

beforeEach(() => jest.clearAllMocks());

const mockPatient = {
  id: 'p1',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  phone: '+1-555-1234',
  email: 'jane@example.com',
  conditions: ['Hypertension', 'Diabetes'],
  lastVisit: '2026-01-10',
  nextAppointment: '2026-03-20',
  riskLevel: 'MEDIUM' as const,
};

describe('PatientHoverCard', () => {
  it('renders trigger children', () => {
    render(
      <PatientHoverCard patient={mockPatient}>
        <button>hover me</button>
      </PatientHoverCard>
    );
    expect(screen.getByText('hover me')).toBeInTheDocument();
  });

  it('shows patient name and risk badge on hover', () => {
    render(
      <PatientHoverCard patient={mockPatient}>
        <button>hover me</button>
      </PatientHoverCard>
    );
    fireEvent.mouseEnter(screen.getByText('hover me').parentElement!);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
  });

  it('hides card on mouse leave', () => {
    render(
      <PatientHoverCard patient={mockPatient}>
        <button>hover me</button>
      </PatientHoverCard>
    );
    const wrapper = screen.getByText('hover me').parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
  });
});
