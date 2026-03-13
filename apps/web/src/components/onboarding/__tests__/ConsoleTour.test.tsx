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
  ACTIONS: { CLOSE: 'close' },
}));

const ConsoleTour = require('../ConsoleTour').default;

const LS_KEY = 'holilabs:consoleTourSeen:v1';

describe('ConsoleTour', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<ConsoleTour />);
    expect(getByTestId('joyride')).toBeInTheDocument();
  });

  it('does not start tour if already seen in localStorage', () => {
    localStorage.setItem(LS_KEY, 'true');
    const { getByTestId } = render(<ConsoleTour />);
    jest.advanceTimersByTime(1000);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
  });

  it('starts tour after delay when not yet seen', () => {
    const { getByTestId } = render(<ConsoleTour />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
    act(() => { jest.advanceTimersByTime(1000); });
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'true');
  });

  it('passes 6 steps to Joyride', () => {
    const { getByTestId } = render(<ConsoleTour />);
    expect(getByTestId('joyride')).toHaveAttribute('data-steps', '6');
  });
});
