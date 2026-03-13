/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../SkeletonBase', () => ({
  SkeletonBox: (props: any) => <div data-testid="skeleton-box" {...props} />,
  SkeletonCard: (props: any) => <div data-testid="skeleton-card" {...props} />,
  SkeletonText: (props: any) => <div data-testid="skeleton-text" {...props} />,
}));

const { DashboardSkeleton } = require('../DashboardSkeleton');

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders multiple skeleton boxes for stats cards', () => {
    const { getAllByTestId } = render(<DashboardSkeleton />);
    const boxes = getAllByTestId('skeleton-box');
    expect(boxes.length).toBeGreaterThan(4);
  });
});
