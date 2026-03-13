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

const AuthTour = require('../AuthTour').default;

describe('AuthTour', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<AuthTour tourType="login" />);
    expect(getByTestId('joyride')).toBeInTheDocument();
  });

  it('does not run tour by default', () => {
    const { getByTestId } = render(<AuthTour tourType="login" />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'false');
  });

  it('starts tour when run=true is passed', () => {
    const { getByTestId } = render(<AuthTour tourType="register" run={true} />);
    expect(getByTestId('joyride')).toHaveAttribute('data-run', 'true');
  });

  it('uses 3 login steps', () => {
    const { getByTestId } = render(<AuthTour tourType="login" />);
    expect(getByTestId('joyride')).toHaveAttribute('data-steps', '3');
  });

  it('uses 3 register steps', () => {
    const { getByTestId } = render(<AuthTour tourType="register" />);
    expect(getByTestId('joyride')).toHaveAttribute('data-steps', '3');
  });
});
