/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const Tooltip = require('../Tooltip').default;
const { HelpTooltip } = require('../Tooltip');

describe('Tooltip', () => {
  it('renders children without crashing', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('does not show tooltip content initially', () => {
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>
    );
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });
});

describe('HelpTooltip', () => {
  it('renders help button', () => {
    render(<HelpTooltip content="Some help" />);
    expect(screen.getByLabelText('Help')).toBeInTheDocument();
  });
});
