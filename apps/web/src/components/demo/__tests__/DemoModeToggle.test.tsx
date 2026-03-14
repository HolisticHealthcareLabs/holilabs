/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/lib/demo/demo-data-generator', () => ({
  isDemoModeEnabled: jest.fn(() => false),
  toggleDemoMode: jest.fn(() => true),
}));

const DemoModeToggle = require('../DemoModeToggle').default;

describe('DemoModeToggle', () => {
  it('renders the Live/Demo toggle button after hydration', () => {
    render(<DemoModeToggle />);
    expect(screen.getByRole('button', { name: /live|demo/i })).toBeInTheDocument();
  });

  it('displays Live label when demo mode is off', () => {
    const { isDemoModeEnabled } = require('@/lib/demo/demo-data-generator');
    (isDemoModeEnabled as jest.Mock).mockReturnValue(false);
    render(<DemoModeToggle />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays Demo label when demo mode is on', () => {
    const { isDemoModeEnabled } = require('@/lib/demo/demo-data-generator');
    (isDemoModeEnabled as jest.Mock).mockReturnValue(true);
    render(<DemoModeToggle />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });
});
