/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { AttestationSim } = require('../AttestationSim');

const mockAlert = {
  id: 'a1',
  summary: 'Warfarin + Aspirin interaction',
  severity: 'critical' as const,
  category: 'drug-interaction',
  indicator: 'critical' as const,
  source: { label: 'CDS Engine', url: '' },
  overrideReasons: ['clinical_judgment'],
};

describe('AttestationSim', () => {
  it('renders the override form initially', () => {
    render(<AttestationSim alert={mockAlert} onClose={jest.fn()} />);
    expect(screen.getByText(/override request/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('submit button is disabled when no reason code is selected', () => {
    render(<AttestationSim alert={mockAlert} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: /submit override/i })).toBeDisabled();
  });

  it('shows the governance audit trail after submitting a valid reason', () => {
    render(<AttestationSim alert={mockAlert} onClose={jest.fn()} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'CLINICAL_JUDGMENT_PALLIATIVE_CARE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit override/i }));
    expect(screen.getByText(/governance audit trail/i)).toBeInTheDocument();
    expect(screen.getByText(/override recorded/i)).toBeInTheDocument();
  });
});
