/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const { ConsoleFilterBar } = require('../ConsoleFilterBar');

describe('ConsoleFilterBar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ConsoleFilterBar onFilterChange={jest.fn()} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders date inputs and buttons', () => {
    render(<ConsoleFilterBar onFilterChange={jest.fn()} />);
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByText('Apply')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('calls onFilterChange when Reset clicked', () => {
    const onFilterChange = jest.fn();
    render(<ConsoleFilterBar onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(onFilterChange).toHaveBeenCalledWith({});
  });
});
