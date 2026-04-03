/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const _mockSetTheme = jest.fn();

jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: (...args: any[]) => _mockSetTheme(...args),
    resolvedTheme: 'light',
  }),
}));

const ThemeToggle = require('../ThemeToggle').default;

describe('ThemeToggle', () => {
  beforeEach(() => {
    _mockSetTheme.mockClear();
  });

  it('renders without crashing', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has an accessible aria-label describing the current theme', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toMatch(/Light/i);
  });

  it('calls setTheme with "dark" when clicked from light theme', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(_mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('renders button with theme icon (no tooltip in JSDOM)', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeTruthy();
  });
});
