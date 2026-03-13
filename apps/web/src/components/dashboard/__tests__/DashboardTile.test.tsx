/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const DashboardTile = require('../DashboardTile').default || require('../DashboardTile').DashboardTile;

describe('DashboardTile', () => {
  const props = {
    title: 'Patients',
    description: 'Manage patient records',
    icon: '👤',
    href: '/dashboard/patients',
    color: 'blue' as const,
  };

  it('renders without crashing', () => {
    const { container } = render(<DashboardTile {...props} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays title and description', () => {
    render(<DashboardTile {...props} />);
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Manage patient records')).toBeInTheDocument();
  });

  it('renders link with correct href', () => {
    const { container } = render(<DashboardTile {...props} />);
    expect(container.querySelector('a[href="/dashboard/patients"]')).toBeTruthy();
  });
});
