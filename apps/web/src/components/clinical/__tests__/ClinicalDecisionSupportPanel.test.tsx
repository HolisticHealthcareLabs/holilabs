/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { interactions: [] } }) })
) as any;

import { ClinicalDecisionSupportPanel } from '../ClinicalDecisionSupportPanel';

beforeEach(() => jest.clearAllMocks());

describe('ClinicalDecisionSupportPanel', () => {
  it('renders the panel header', () => {
    render(<ClinicalDecisionSupportPanel patient={null} currentMedications={[]} symptoms={[]} diagnoses={[]} />);
    expect(screen.getByText('Clinical Decision Support')).toBeInTheDocument();
  });

  it('shows "No interactions detected" when fewer than 2 medications', () => {
    render(<ClinicalDecisionSupportPanel patient={null} currentMedications={['aspirin']} symptoms={[]} diagnoses={[]} />);
    expect(screen.getByText('No interactions detected')).toBeInTheDocument();
  });

  it('shows allergy alert when medication matches patient allergy', () => {
    const patient = { id: 'p1', allergies: [{ allergen: 'penicillin', reaction: 'rash', severity: 'moderate' }] };
    render(<ClinicalDecisionSupportPanel patient={patient} currentMedications={['penicillin 500mg']} symptoms={[]} diagnoses={[]} />);
    expect(screen.getByText(/penicillin 500mg may cause allergic reaction/i)).toBeInTheDocument();
  });
});
