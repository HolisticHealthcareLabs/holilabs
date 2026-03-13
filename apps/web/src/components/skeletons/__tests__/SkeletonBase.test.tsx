/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

const {
  SkeletonBox,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonButton,
} = require('../SkeletonBase');

describe('SkeletonBox', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonBox className="h-4 w-32" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('SkeletonText', () => {
  it('renders the correct number of lines', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const lines = container.querySelectorAll('.h-4');
    expect(lines.length).toBe(3);
  });
});

describe('SkeletonCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('SkeletonTable', () => {
  it('renders with default rows and columns', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild).toBeInTheDocument();
  });
});

describe('SkeletonAvatar', () => {
  it('renders small avatar', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);
    expect(container.querySelector('.w-8')).toBeInTheDocument();
  });

  it('renders large avatar', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    expect(container.querySelector('.w-16')).toBeInTheDocument();
  });
});

describe('SkeletonButton', () => {
  it('renders without crashing', () => {
    const { container } = render(<SkeletonButton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
