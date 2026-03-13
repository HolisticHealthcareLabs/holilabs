/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const {
  CustomDateDisplay,
  CustomDateDisplayCard,
  DateRangeDisplay,
} = require('../CustomDateDisplay');

describe('CustomDateDisplay', () => {
  const testDate = new Date(2025, 9, 24); // October 24, 2025

  it('renders the day number', () => {
    render(<CustomDateDisplay date={testDate} />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('renders compact variant without crashing', () => {
    const { container } = render(<CustomDateDisplay date={testDate} variant="compact" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders large variant without crashing', () => {
    const { container } = render(<CustomDateDisplay date={testDate} variant="large" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('CustomDateDisplayCard', () => {
  const testDate = new Date(2025, 9, 24);

  it('renders as a button element', () => {
    render(<CustomDateDisplayCard date={testDate} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when interactive and clicked', () => {
    const onClick = jest.fn();
    render(<CustomDateDisplayCard date={testDate} interactive onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('DateRangeDisplay', () => {
  it('renders both dates without crashing', () => {
    const start = new Date(2025, 9, 1);
    const end = new Date(2025, 9, 15);
    const { container } = render(<DateRangeDisplay startDate={start} endDate={end} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
