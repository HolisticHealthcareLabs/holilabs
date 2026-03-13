/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('../SkeletonBase', () => ({
  SkeletonBox: (props: any) => <div data-testid="skeleton-box" {...props} />,
}));

const { ScribeSkeleton } = require('../ScribeSkeleton');

describe('ScribeSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<ScribeSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders skeleton boxes for SOAP sections', () => {
    const { getAllByTestId } = render(<ScribeSkeleton />);
    expect(getAllByTestId('skeleton-box').length).toBeGreaterThan(10);
  });
});
