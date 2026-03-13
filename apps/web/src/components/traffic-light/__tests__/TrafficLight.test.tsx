/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/traffic-light/types', () => ({}), { virtual: true });

const { TrafficLight, TrafficLightIndicator } = require('../TrafficLight');

const greenResult = {
  color: 'GREEN' as const,
  signals: [],
  summary: {
    clinical: { red: 0, yellow: 0, green: 0 },
    billing: { red: 0, yellow: 0, green: 0 },
    administrative: { red: 0, yellow: 0, green: 0 },
  },
  canOverride: false,
  overrideRequires: 'self' as const,
  metadata: { latencyMs: 50 },
};

describe('TrafficLight', () => {
  it('renders loading skeleton when loading=true', () => {
    const { container } = render(<TrafficLight result={null} loading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders awaiting state when result is null', () => {
    render(<TrafficLight result={null} />);
    expect(screen.getByText('Awaiting evaluation...')).toBeInTheDocument();
  });

  it('renders Approved for GREEN result', () => {
    render(<TrafficLight result={greenResult} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});

describe('TrafficLightIndicator', () => {
  it('renders a colored indicator for RED', () => {
    const { container } = render(<TrafficLightIndicator color="RED" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with pulse animation', () => {
    const { container } = render(<TrafficLightIndicator color="YELLOW" pulse />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
