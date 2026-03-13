/** @jest-environment jsdom */
import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-joyride', () => ({
  __esModule: true,
  default: ({ run, steps }: { run: boolean; steps: unknown[] }) => (
    <div data-testid="joyride" data-run={String(run)} data-steps={steps.length} />
  ),
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
}));

jest.mock('canvas-confetti', () => jest.fn());

const DashboardWalkthrough = require('../DashboardWalkthrough').default;

describe('DashboardWalkthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<DashboardWalkthrough />);
    expect(getByTestId('joyride')).toBeInTheDocument();
  });

  it('does not start tour if already seen', () => {
    localStorage.setItem('has_seen_dashboard_walkthrough', 'true');
    const { getByTestId } = render(<DashboardWalkthrough />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
  });

  it('starts tour after delay when not yet seen', () => {
    const { getByTestId } = render(<DashboardWalkthrough />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
    act(() => { jest.advanceTimersByTime(600); });
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'true');
  });

  it('passes 4 steps to Joyride', () => {
    const { getByTestId } = render(<DashboardWalkthrough />);
    expect(getByTestId('joyride')).toHaveAttribute('data-steps', '4');
  });
});
