/** @jest-environment jsdom */
jest.mock('@react-pdf/renderer', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ children }: any) => <div data-testid="pdf-page">{children}</div>,
  Text: ({ children }: any) => <span>{children}</span>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (s: any) => s },
  Font: { register: jest.fn() },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SOAPNotePDF } from '../SOAPNotePDF';

const record = {
  id: 'note-1',
  subjective: 'Patient reports headache',
  objective: 'BP 120/80',
  assessment: 'Tension headache',
  plan: 'Ibuprofen 400mg',
  status: 'SIGNED',
  createdAt: '2024-01-15T10:00:00Z',
  noteHash: 'abc123hash',
  patient: { firstName: 'Alice', lastName: 'Smith', dateOfBirth: '1985-01-01', mrn: 'MRN001' },
  clinician: { firstName: 'Dr', lastName: 'House', specialty: 'Internal Medicine', licenseNumber: 'LIC001' },
};

describe('SOAPNotePDF', () => {
  it('renders patient name', () => {
    render(<SOAPNotePDF record={record} />);
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
  });

  it('renders SOAP sections', () => {
    render(<SOAPNotePDF record={record} />);
    expect(screen.getByText(/Patient reports headache/)).toBeInTheDocument();
    expect(screen.getByText(/Tension headache/)).toBeInTheDocument();
  });

  it('renders blockchain hash when noteHash is present', () => {
    render(<SOAPNotePDF record={record} />);
    expect(screen.getByText('abc123hash')).toBeInTheDocument();
  });
});
