/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('@heroicons/react/24/outline', () => ({
  PrinterIcon: (props: any) => <div data-testid="printer-icon" {...props} />,
}));
jest.mock('date-fns', () => ({
  format: (_date: any, fmt: string) => `formatted-${fmt}`,
}));

import { PrintableSoapNote } from '../PrintableSoapNote';

const mockNote = {
  id: 'note-1',
  subjective: 'Patient reports headache',
  objective: 'BP 120/80',
  assessment: 'Tension headache',
  plan: 'Rest and analgesics',
  chiefComplaint: 'Headache',
  signed: false,
  signedAt: null,
  signedBy: null,
  createdAt: new Date('2025-01-01'),
};

const mockPatient = {
  id: 'p-1',
  tokenId: 'TOK-001',
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: new Date('1990-01-01'),
  age: 35,
  gender: 'Male',
  mrn: 'MRN-123',
};

const mockClinician = {
  firstName: 'Dr. Jane',
  lastName: 'Smith',
  email: 'jane@clinic.com',
  specialty: 'Internal Medicine',
};

describe('PrintableSoapNote', () => {
  it('renders without crashing', () => {
    render(<PrintableSoapNote note={mockNote} patient={mockPatient} clinician={mockClinician} />);
    expect(screen.getByText('Clinical SOAP Note')).toBeInTheDocument();
  });

  it('displays patient name', () => {
    render(<PrintableSoapNote note={mockNote} patient={mockPatient} clinician={mockClinician} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders SOAP sections', () => {
    render(<PrintableSoapNote note={mockNote} patient={mockPatient} clinician={mockClinician} />);
    expect(screen.getByText('Subjective (S)')).toBeInTheDocument();
    expect(screen.getByText('Assessment (A)')).toBeInTheDocument();
  });
});
