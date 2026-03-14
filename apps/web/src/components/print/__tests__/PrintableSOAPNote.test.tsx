/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PrintableSOAPNote } from '../PrintableSOAPNote';

const note = {
  id: 'note-1',
  type: 'SOAP',
  subjective: 'Patient has headache',
  objective: 'BP normal',
  assessment: 'Tension type headache',
  plan: 'Rest and analgesics',
  createdAt: '2024-06-01T10:00:00Z',
  diagnoses: [{ code: 'G44.2', description: 'Tension headache' }],
  procedures: [],
  author: { firstName: 'John', lastName: 'Doe', specialty: 'Neurology', licenseNumber: 'LIC-999' },
};

const patient = {
  firstName: 'Maria',
  lastName: 'Garcia',
  mrn: 'MRN-123',
  dateOfBirth: '1990-05-15',
  gender: 'female',
};

describe('PrintableSOAPNote', () => {
  it('renders patient name and MRN', () => {
    render(<PrintableSOAPNote note={note} patient={patient} />);
    expect(screen.getByText(/Maria Garcia/)).toBeInTheDocument();
    expect(screen.getByText('MRN-123')).toBeInTheDocument();
  });

  it('renders SOAP sections', () => {
    render(<PrintableSOAPNote note={note} patient={patient} />);
    expect(screen.getByText('Patient has headache')).toBeInTheDocument();
    expect(screen.getByText('Tension type headache')).toBeInTheDocument();
    expect(screen.getByText('Rest and analgesics')).toBeInTheDocument();
  });

  it('renders diagnosis codes', () => {
    render(<PrintableSOAPNote note={note} patient={patient} />);
    expect(screen.getByText('G44.2')).toBeInTheDocument();
    expect(screen.getByText(/Tension headache/)).toBeInTheDocument();
  });
});
