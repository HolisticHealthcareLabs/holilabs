/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { ClinicalDecisionSupport } from '../ClinicalDecisionSupport';

describe('ClinicalDecisionSupport', () => {
  it('renders empty state with no patient data', () => {
    render(<ClinicalDecisionSupport />);
    expect(screen.getByText('No hay alertas activas')).toBeInTheDocument();
  });

  it('generates alerts when patient data triggers conditions', () => {
    const patientData = {
      conditions: ['Hipertensión'],
      medications: [],
      allergies: [],
    };
    render(<ClinicalDecisionSupport patientData={patientData} />);
    expect(screen.getByText('Alertas Clínicas')).toBeInTheDocument();
  });

  it('renders clinical guidelines for matching conditions', () => {
    const patientData = {
      conditions: ['Hipertensión'],
      medications: [],
      allergies: [],
    };
    render(<ClinicalDecisionSupport patientData={patientData} showGuidelines />);
    expect(screen.getByText('Guías Clínicas Relevantes')).toBeInTheDocument();
  });
});
