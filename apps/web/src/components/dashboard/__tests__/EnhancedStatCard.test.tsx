/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: 'div', button: 'button', p: 'p', span: 'span',
    path: 'path', circle: 'circle', svg: 'svg',
  },
  AnimatePresence: ({ children }: any) => children,
}));
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}));

const { EnhancedStatCard, EnhancedStatCardSkeleton, EnhancedStatCardGrid } = require('../EnhancedStatCard');

describe('EnhancedStatCard', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <EnhancedStatCard label="Patients Today" value={12} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('displays label and value', () => {
    render(<EnhancedStatCard label="Patients Today" value="42" />);
    expect(screen.getByText('Patients Today')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { container } = render(
      <EnhancedStatCard label="Loading" value="" loading />
    );
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});

describe('EnhancedStatCardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<EnhancedStatCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});

describe('EnhancedStatCardGrid', () => {
  it('renders children in a grid', () => {
    const { container } = render(
      <EnhancedStatCardGrid><div>child</div></EnhancedStatCardGrid>
    );
    expect(container.querySelector('.grid')).toBeTruthy();
  });
});
