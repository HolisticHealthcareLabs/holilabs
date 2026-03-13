/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../SkeletonBase', () => ({
  SkeletonBox: (props: any) => <div data-testid="skeleton-box" {...props} />,
  SkeletonCard: (props: any) => <div data-testid="skeleton-card" {...props} />,
  SkeletonText: (props: any) => <div data-testid="skeleton-text" {...props} />,
  SkeletonAvatar: (props: any) => <div data-testid="skeleton-avatar" {...props} />,
}));

const { PatientDetailSkeleton } = require('../PatientDetailSkeleton');

describe('PatientDetailSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<PatientDetailSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders avatar skeleton', () => {
    const { getByTestId } = render(<PatientDetailSkeleton />);
    expect(getByTestId('skeleton-avatar')).toBeInTheDocument();
  });
});
