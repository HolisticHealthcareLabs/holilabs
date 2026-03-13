/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { SegmentedToggle, SegmentedTabs } = require('../SegmentedToggle');

describe('SegmentedToggle', () => {
  it('renders both labels', () => {
    render(<SegmentedToggle value={false} onChange={jest.fn()} labelOn="Active" labelOff="Inactive" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('calls onChange(true) when On button clicked', () => {
    const handler = jest.fn();
    render(<SegmentedToggle value={false} onChange={handler} labelOn="On" labelOff="Off" />);
    fireEvent.click(screen.getByText('On'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when Off button clicked', () => {
    const handler = jest.fn();
    render(<SegmentedToggle value={true} onChange={handler} labelOn="On" labelOff="Off" />);
    fireEvent.click(screen.getByText('Off'));
    expect(handler).toHaveBeenCalledWith(false);
  });
});

describe('SegmentedTabs', () => {
  const options = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
  ];

  it('renders all options', () => {
    render(<SegmentedTabs value="day" onChange={jest.fn()} options={options} />);
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
  });

  it('calls onChange with selected value', () => {
    const handler = jest.fn();
    render(<SegmentedTabs value="day" onChange={handler} options={options} />);
    fireEvent.click(screen.getByText('Month'));
    expect(handler).toHaveBeenCalledWith('month');
  });
});
