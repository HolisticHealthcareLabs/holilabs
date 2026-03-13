/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) =>
      React.forwardRef(({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<unknown>) => {
        const Tag = typeof prop === 'string' ? prop : 'div';
        return React.createElement(Tag, { ...rest, ref }, children);
      }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const {
  Skeleton,
  LoadingSpinner,
  CardSkeleton,
  ListSkeleton,
  InlineLoader,
} = require('../SkeletonLoader');

describe('Skeleton', () => {
  it('renders with loading role and aria-label', () => {
    render(<Skeleton />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-label', 'Loading');
  });

  it('forwards className', () => {
    const { container } = render(<Skeleton className="w-32 h-4" />);
    expect(container.firstChild).toHaveClass('w-32', 'h-4');
  });
});

describe('LoadingSpinner', () => {
  it('renders a spinning div', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('applies size classes for lg', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });
});

describe('CardSkeleton', () => {
  it('renders multiple Skeleton elements', () => {
    render(<CardSkeleton />);
    expect(screen.getAllByRole('status').length).toBeGreaterThan(1);
  });
});

describe('ListSkeleton', () => {
  it('renders the specified number of skeleton items', () => {
    render(<ListSkeleton items={3} />);
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(3);
  });
});

describe('InlineLoader', () => {
  it('renders message when provided', () => {
    render(<InlineLoader message="Loading patients..." />);
    expect(screen.getByText('Loading patients...')).toBeInTheDocument();
  });
});
