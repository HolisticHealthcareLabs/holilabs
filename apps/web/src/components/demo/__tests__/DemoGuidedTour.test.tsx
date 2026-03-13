/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const { DemoGuidedTour } = require('../DemoGuidedTour');

describe('DemoGuidedTour', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => {
      store[key] = val;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<DemoGuidedTour />);
    expect(container).toBeInTheDocument();
  });

  it('does not show tour overlay by default', () => {
    render(<DemoGuidedTour />);
    expect(screen.queryByText('Real-Time Safety Checks')).not.toBeInTheDocument();
  });
});
