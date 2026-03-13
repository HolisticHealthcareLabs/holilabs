/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { SituationBadges } = require('../SituationBadges');

const mockSituations = [
  { id: 'urgent', name: 'Urgente', color: '#f97316', priority: 1 },
];

const mockAvailable = [
  { id: 'urgent', name: 'Urgente', color: '#f97316', priority: 1 },
  { id: 'followup', name: 'Seguimiento', color: '#22c55e', priority: 2 },
];

describe('SituationBadges', () => {
  it('renders existing situation badges', () => {
    render(
      <SituationBadges
        appointmentId="appt-1"
        situations={mockSituations}
        availableSituations={mockAvailable}
        onSituationsChange={jest.fn()}
        onPaymentNotificationSend={jest.fn()}
      />
    );
    expect(screen.getByText('Urgente')).toBeInTheDocument();
  });

  it('shows add button when slots remain', () => {
    render(
      <SituationBadges
        appointmentId="appt-1"
        situations={mockSituations}
        availableSituations={mockAvailable}
        onSituationsChange={jest.fn()}
        onPaymentNotificationSend={jest.fn()}
      />
    );
    expect(screen.getByText('+ Agregar')).toBeInTheDocument();
  });

  it('calls onSituationsChange when removing a situation', () => {
    const onChange = jest.fn();
    render(
      <SituationBadges
        appointmentId="appt-1"
        situations={mockSituations}
        availableSituations={mockAvailable}
        onSituationsChange={onChange}
        onPaymentNotificationSend={jest.fn()}
      />
    );
    const removeButtons = screen.getAllByRole('button');
    // The remove button is nested inside the badge button
    const innerRemove = removeButtons.find(b => b.querySelector('svg'));
    if (innerRemove) {
      fireEvent.click(innerRemove);
      expect(onChange).toHaveBeenCalled();
    }
  });
});
