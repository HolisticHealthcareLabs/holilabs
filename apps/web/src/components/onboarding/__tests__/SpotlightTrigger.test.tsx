/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  return function mockDynamic() {
    return function MockJoyride() {
      return null;
    };
  };
});

jest.mock('lucide-react', () => ({
  Play: (props: any) => <svg data-testid="play-icon" {...props} />,
}));

const SpotlightTrigger = require('../SpotlightTrigger').default;

describe('SpotlightTrigger', () => {
  const steps = [
    { target: '#nav', title: 'Navigation', content: 'This is your nav bar' },
    { target: '#main', title: 'Main Area', content: 'Main content here' },
  ];

  it('renders the trigger button with default label', () => {
    render(<SpotlightTrigger steps={steps} />);
    expect(screen.getByText('Quick Tour')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<SpotlightTrigger steps={steps} label="Start Walkthrough" />);
    expect(screen.getByText('Start Walkthrough')).toBeInTheDocument();
  });

  it('renders play icon', () => {
    render(<SpotlightTrigger steps={steps} />);
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });
});
