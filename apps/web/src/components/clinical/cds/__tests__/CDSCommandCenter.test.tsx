/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

jest.mock('../AlertMonitor', () => ({ AlertMonitor: () => <div data-testid="alert-monitor" /> }));
jest.mock('../RuleManager', () => ({ RuleManager: () => <div data-testid="rule-manager" /> }));
jest.mock('../AlertHistory', () => ({ AlertHistory: () => <div data-testid="alert-history" /> }));
jest.mock('../AnalyticsDashboard', () => ({ AnalyticsDashboard: () => <div data-testid="analytics" /> }));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ currentRules: [] }),
});

const localStorageMock = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() };
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

import { CDSCommandCenter } from '../CDSCommandCenter';

describe('CDSCommandCenter', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders the command center heading', () => {
    render(<CDSCommandCenter />);
    expect(screen.getByText('CDS Command Center')).toBeInTheDocument();
  });

  it('renders view mode selector buttons', () => {
    render(<CDSCommandCenter />);
    expect(screen.getByText(/Compact/)).toBeInTheDocument();
    expect(screen.getByText(/Standard/)).toBeInTheDocument();
    expect(screen.getByText(/Detailed/)).toBeInTheDocument();
  });

  it('renders status bar with panel count', () => {
    render(<CDSCommandCenter />);
    expect(screen.getByText(/panel/)).toBeInTheDocument();
  });
});
