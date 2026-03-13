/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

const {
  CardSkeleton,
  ListItemSkeleton,
  TableRowSkeleton,
  DashboardCardSkeleton,
  ProfileSkeleton,
  ChartSkeleton,
  FormSkeleton,
  Skeleton,
} = require('../LoadingSkeleton');

describe('LoadingSkeleton', () => {
  it('renders CardSkeleton without crashing', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders ListItemSkeleton without crashing', () => {
    const { container } = render(<ListItemSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders TableRowSkeleton inside a table', () => {
    const { container } = render(
      <table><tbody><TableRowSkeleton /></tbody></table>
    );
    expect(container.querySelector('tr')).toBeTruthy();
  });

  it('renders DashboardCardSkeleton without crashing', () => {
    const { container } = render(<DashboardCardSkeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders ProfileSkeleton without crashing', () => {
    const { container } = render(<ProfileSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders ChartSkeleton without crashing', () => {
    const { container } = render(<ChartSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders FormSkeleton without crashing', () => {
    const { container } = render(<FormSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders Skeleton with custom props', () => {
    const { container } = render(<Skeleton width="w-32" height="h-8" />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});
