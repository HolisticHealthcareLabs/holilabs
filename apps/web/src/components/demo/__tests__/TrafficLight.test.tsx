/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const { TrafficLight } = require('../TrafficLight');

describe('TrafficLight', () => {
  it('renders without crashing', () => {
    const { container } = render(<TrafficLight signal="green" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has correct aria-label for green signal', () => {
    render(<TrafficLight signal="green" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Safety signal: green'
    );
  });

  it('has correct aria-label for red signal', () => {
    render(<TrafficLight signal="red" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Safety signal: red'
    );
  });

  it('has correct aria-label for off signal', () => {
    render(<TrafficLight signal="off" />);
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Safety check not run'
    );
  });
});
