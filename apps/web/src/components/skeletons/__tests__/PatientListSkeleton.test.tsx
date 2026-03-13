/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../SkeletonBase', () => ({
  SkeletonBox: (props: any) => <div data-testid="skeleton-box" {...props} />,
  SkeletonTable: (props: any) => <div data-testid="skeleton-table" {...props} />,
}));

const { PatientListSkeleton } = require('../PatientListSkeleton');

describe('PatientListSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<PatientListSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a skeleton table', () => {
    const { getByTestId } = render(<PatientListSkeleton />);
    expect(getByTestId('skeleton-table')).toBeInTheDocument();
  });
});
