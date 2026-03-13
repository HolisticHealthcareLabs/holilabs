/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => React.forwardRef(({ children, ...rest }: any, ref: any) => {
      const Tag = typeof prop === 'string' ? prop : 'div';
      return React.createElement(Tag, { ...rest, ref }, children);
    }),
  }),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { CoPilotOnboarding } from '../CoPilotOnboarding';

describe('CoPilotOnboarding', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  it('renders first onboarding step after delay', () => {
    render(<CoPilotOnboarding />);
    act(() => { jest.advanceTimersByTime(600); });
    expect(screen.getByText('Select Your Patient')).toBeInTheDocument();
  });

  it('advances to next step on Next click', () => {
    render(<CoPilotOnboarding />);
    act(() => { jest.advanceTimersByTime(600); });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('AI Tool Bubbles')).toBeInTheDocument();
  });

  it('hides when Skip Tour is clicked', () => {
    render(<CoPilotOnboarding />);
    act(() => { jest.advanceTimersByTime(600); });
    expect(screen.getByText('Select Your Patient')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Skip Tour'));
    expect(screen.queryByText('Select Your Patient')).not.toBeInTheDocument();
  });
});
