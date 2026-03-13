/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const EmptyState = require('../EmptyState').default;

describe('EmptyState', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <EmptyState icon="👤" title="No patients" description="Add your first patient" />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays title and description', () => {
    render(
      <EmptyState icon="📅" title="No appointments" description="Schedule something" />
    );
    expect(screen.getByText('No appointments')).toBeInTheDocument();
    expect(screen.getByText('Schedule something')).toBeInTheDocument();
  });

  it('renders primary action as link when href provided', () => {
    render(
      <EmptyState
        icon="📝"
        title="Empty"
        description="Desc"
        primaryAction={{ label: 'Go', href: '/new' }}
      />
    );
    const link = screen.getByText('Go');
    expect(link.closest('a')).toHaveAttribute('href', '/new');
  });

  it('renders primary action as button when onClick provided', () => {
    const onClick = jest.fn();
    render(
      <EmptyState
        icon="📝"
        title="Empty"
        description="Desc"
        primaryAction={{ label: 'Click', onClick }}
      />
    );
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalled();
  });
});
