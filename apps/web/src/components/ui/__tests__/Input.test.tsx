/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { Input, PasswordInput, SearchInput } = require('../Input');

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email address" />);
    expect(screen.getByText('Email address')).toBeInTheDocument();
  });

  it('renders error message and sets aria-invalid', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders helper text when no error', () => {
    render(<Input helperText="Enter your email" />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('forwards value and onChange', () => {
    const handler = jest.fn();
    render(<Input value="test@example.com" onChange={handler} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test@example.com');
    fireEvent.change(input, { target: { value: 'new@example.com' } });
    expect(handler).toHaveBeenCalled();
  });
});

describe('PasswordInput', () => {
  it('renders as password type by default', () => {
    const { container } = render(<PasswordInput label="Password" />);
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
  });
});

describe('SearchInput', () => {
  it('renders search input with type=search', () => {
    const { container } = render(<SearchInput placeholder="Search..." />);
    expect(container.querySelector('input[type="search"]')).toBeInTheDocument();
  });
});
