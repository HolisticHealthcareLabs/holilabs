/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard';

jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="mock-icon" {...props} />
);

describe('StatCard', () => {
  it('renders title and value', () => {
    render(
      <StatCard title="Total Referrals" value="42" icon={MockIcon as any} color="blue" />
    );
    expect(screen.getByText('Total Referrals')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <StatCard
        title="Revenue"
        value="R$ 5.000"
        icon={MockIcon as any}
        color="emerald"
        description="This month"
      />
    );
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('renders icon element', () => {
    render(
      <StatCard title="Stat" value="10" icon={MockIcon as any} color="indigo" />
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });
});
