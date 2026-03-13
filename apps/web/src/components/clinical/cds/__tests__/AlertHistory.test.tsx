/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { AlertHistory } from '../AlertHistory';

describe('AlertHistory', () => {
  it('renders heading and loading state initially', () => {
    render(<AlertHistory />);
    expect(screen.getByText('Alert History')).toBeInTheDocument();
  });

  it('displays statistics section after data loads', async () => {
    render(<AlertHistory />);
    const totalActions = await screen.findByText('Total Actions');
    expect(totalActions).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<AlertHistory />);
    expect(screen.getByText(/Export/)).toBeInTheDocument();
  });
});
