/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_: any, tag: string) => tag }),
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('next/dynamic', () => () => () => null);
jest.mock('../ScenarioSelector', () => ({
  ScenarioSelector: ({ onSelect }: any) => (
    <div data-testid="scenario-selector">ScenarioSelector</div>
  ),
}));
jest.mock('../PatientSummary', () => ({
  PatientSummary: () => <div data-testid="patient-summary">PatientSummary</div>,
}));
jest.mock('../TrafficLight', () => ({
  TrafficLight: () => <div data-testid="traffic-light">TrafficLight</div>,
}));
jest.mock('../AlertList', () => ({
  AlertList: () => <div data-testid="alert-list">AlertList</div>,
}));

const { DemoPlayground } = require('../DemoPlayground');

describe('DemoPlayground', () => {
  it('renders the Experience Cortex hero heading', () => {
    render(<DemoPlayground />);
    expect(screen.getByText('Experience Cortex')).toBeInTheDocument();
  });

  it('renders the ScenarioSelector step', () => {
    render(<DemoPlayground />);
    expect(screen.getByTestId('scenario-selector')).toBeInTheDocument();
  });

  it('does not show the run evaluation button before a scenario is selected', () => {
    render(<DemoPlayground />);
    expect(screen.queryByText(/run safety check/i)).not.toBeInTheDocument();
  });
});
