/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('@radix-ui/react-popover', () => ({
  Root: ({ children }: any) => <div>{children}</div>,
  Trigger: ({ children }: any) => <div>{children}</div>,
  Portal: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <div>{children}</div>,
  Arrow: () => <div data-testid="arrow" />,
}));

import { PulseTooltip } from '../PulseTooltip';

describe('PulseTooltip', () => {
  it('renders children without crashing', () => {
    render(
      <PulseTooltip content="Tooltip text">
        <button>Hover me</button>
      </PulseTooltip>
    );
    expect(screen.getByText('Hover me')).toBeInTheDocument();
  });

  it('renders tooltip content', () => {
    render(
      <PulseTooltip content="Info message" showOnMount>
        <span>Target</span>
      </PulseTooltip>
    );
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });
});
