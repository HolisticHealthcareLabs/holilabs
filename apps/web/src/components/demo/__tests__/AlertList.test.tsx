/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { AlertList } = require('../AlertList');

const makeAlert = (overrides: any) => ({
  id: 'a1',
  summary: 'Test Alert',
  severity: 'info' as const,
  category: 'guideline-recommendation',
  indicator: 'info' as const,
  source: { label: 'CDS Engine', url: '' },
  overrideReasons: [],
  ...overrides,
});

describe('AlertList', () => {
  it('shows empty state when alerts array is empty', () => {
    render(<AlertList alerts={[]} />);
    expect(screen.getByText(/no alerts generated/i)).toBeInTheDocument();
  });

  it('renders all alerts sorted critical-first', () => {
    const alerts = [
      makeAlert({ id: 'a1', summary: 'Low info alert', severity: 'info' }),
      makeAlert({ id: 'a2', summary: 'Critical alert', severity: 'critical' }),
    ];
    render(<AlertList alerts={alerts} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Critical alert');
    expect(items[1]).toHaveTextContent('Low info alert');
  });

  it('expands detail text when More button is clicked', () => {
    const alert = makeAlert({
      id: 'a1',
      summary: 'Drug Interaction',
      severity: 'warning',
      detail: 'Detailed clinical explanation here.',
    });
    render(<AlertList alerts={[alert]} />);
    fireEvent.click(screen.getByRole('button', { name: /expand details/i }));
    expect(screen.getByText('Detailed clinical explanation here.')).toBeInTheDocument();
  });
});
