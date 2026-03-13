/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('react-joyride', () => ({
  __esModule: true,
  default: ({ run, steps }: { run: boolean; steps: unknown[] }) => (
    <div data-testid="joyride" data-run={String(run)} data-steps={steps.length} />
  ),
  STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
}));

const ScribeTour = require('../ScribeTour').default;

describe('ScribeTour', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<ScribeTour />);
    expect(getByTestId('joyride')).toBeInTheDocument();
  });

  it('does not run tour by default', () => {
    const { getByTestId } = render(<ScribeTour />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
  });

  it('starts tour when run=true is passed', () => {
    const { getByTestId } = render(<ScribeTour run={true} />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'true');
  });

  it('provides 6 scribe steps', () => {
    const { getByTestId } = render(<ScribeTour />);
    expect(getByTestId('joyride')).toHaveAttribute('data-steps', '6');
  });
});
