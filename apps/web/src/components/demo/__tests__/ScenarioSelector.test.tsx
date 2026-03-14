/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('@/lib/demo/demo-scenarios', () => ({
  DEMO_SCENARIOS: {
    diabetes: {
      id: 'diabetes',
      name: 'Diabetic Patient',
      description: 'Patient with uncontrolled diabetes and lab abnormalities.',
      trafficLight: 'yellow',
      demographicsSummary: '58F, HbA1c 9.2%',
      context: {},
    },
    drugInteraction: {
      id: 'drugInteraction',
      name: 'Drug Interaction',
      description: 'Warfarin + Aspirin co-prescription with penicillin allergy.',
      trafficLight: 'red',
      demographicsSummary: '72M',
      context: {},
    },
  },
}));

const { ScenarioSelector } = require('../ScenarioSelector');

describe('ScenarioSelector', () => {
  it('renders the select a patient scenario heading', () => {
    render(<ScenarioSelector selectedId={null} onSelect={jest.fn()} />);
    expect(screen.getByText(/select a patient scenario/i)).toBeInTheDocument();
  });

  it('renders all scenario cards from DEMO_SCENARIOS', () => {
    render(<ScenarioSelector selectedId={null} onSelect={jest.fn()} />);
    expect(screen.getByText('Diabetic Patient')).toBeInTheDocument();
    expect(screen.getByText('Drug Interaction')).toBeInTheDocument();
  });

  it('calls onSelect with the correct scenario when a card is clicked', () => {
    const onSelect = jest.fn();
    render(<ScenarioSelector selectedId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('option', { name: /diabetic patient/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'diabetes' })
    );
  });
});
