/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/components/common/Tooltip', () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

const { KPICard } = require('../KPICard');

describe('KPICard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <KPICard label="Total" value={42} unit="count" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays label and value', () => {
    render(<KPICard label="Total Evaluations" value={100} unit="count" />);
    expect(screen.getByText('Total Evaluations')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders percentage with unit', () => {
    render(<KPICard label="Rate" value={75.5} unit="percentage" />);
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <KPICard label="Loading" value={0} unit="count" isLoading />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders error state', () => {
    render(
      <KPICard label="Error KPI" value={0} unit="count" error="Failed to load" />
    );
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });
});
