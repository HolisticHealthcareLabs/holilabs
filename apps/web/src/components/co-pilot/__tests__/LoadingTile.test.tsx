/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const LoadingTile = require('../LoadingTile').default;

describe('LoadingTile', () => {
  it('renders shimmer variant by default', () => {
    const { container } = render(<LoadingTile />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders pulse variant without crashing', () => {
    const { container } = render(<LoadingTile variant="pulse" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders dots variant without crashing', () => {
    const { container } = render(<LoadingTile variant="dots" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies small size class', () => {
    const { container } = render(<LoadingTile size="small" />);
    expect(container.querySelector('.h-40')).toBeInTheDocument();
  });

  it('applies large size class', () => {
    const { container } = render(<LoadingTile size="large" />);
    expect(container.querySelector('.h-96')).toBeInTheDocument();
  });
});
