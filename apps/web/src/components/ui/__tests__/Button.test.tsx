/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/styles/design-tokens', () => ({ designTokens: {} }));

const { Button, IconButton, ButtonGroup } = require('../Button');

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Save</Button>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('is disabled and shows spinner when loading', () => {
    const { container } = render(<Button loading>Saving</Button>);
    const btn = container.querySelector('button');
    expect(btn).toBeDisabled();
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handler = jest.fn();
    render(<Button onClick={handler}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('renders fullWidth class when fullWidth prop set', () => {
    const { container } = render(<Button fullWidth>Wide</Button>);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('renders danger variant classes', () => {
    const { container } = render(<Button variant="danger">Delete</Button>);
    expect(container.firstChild).toHaveClass('from-error-500');
  });
});

describe('IconButton', () => {
  it('renders icon and aria-label', () => {
    render(
      <IconButton icon={<span data-testid="icon" />} aria-label="Close" />
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('ButtonGroup', () => {
  it('renders multiple buttons with group role', () => {
    render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>
    );
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
});
