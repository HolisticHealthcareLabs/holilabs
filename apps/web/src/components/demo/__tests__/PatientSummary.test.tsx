/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const { PatientSummary } = require('../PatientSummary');

const baseContext = {
  patientId: 'demo-1',
  userId: 'demo-clinician',
  hookInstance: 'test-instance',
  hookType: 'patient-view' as const,
  context: {
    patientId: 'demo-1',
    demographics: { age: 65, gender: 'female' as const },
    conditions: [{ id: 'c1', display: 'Hypertension', code: 'I10', icd10Code: 'I10' }],
    medications: [{ id: 'm1', name: 'Metformin', dosage: '500mg', frequency: 'twice daily', status: 'active' as const }],
    allergies: [],
    labResults: [],
  },
};

describe('PatientSummary', () => {
  it('renders the patient name in the header', () => {
    render(<PatientSummary context={baseContext} patientName="Maria Silva" />);
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('displays active conditions with ICD-10 code', () => {
    render(<PatientSummary context={baseContext} patientName="Maria Silva" />);
    expect(screen.getByText('Hypertension')).toBeInTheDocument();
    expect(screen.getByText('(I10)')).toBeInTheDocument();
  });

  it('displays current medications', () => {
    render(<PatientSummary context={baseContext} patientName="Maria Silva" />);
    expect(screen.getByText('Metformin')).toBeInTheDocument();
    expect(screen.getByText('500mg')).toBeInTheDocument();
  });
});
