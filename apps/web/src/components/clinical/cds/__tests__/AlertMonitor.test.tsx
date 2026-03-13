/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

jest.mock('../AlertCard', () => ({
  AlertCard: ({ alert }: any) => <div data-testid="alert-card">{alert.summary}</div>,
}));

global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  statusText: 'OK',
  json: () => Promise.resolve({ data: { alerts: [] } }),
});

import { AlertMonitor } from '../AlertMonitor';

describe('AlertMonitor', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders heading without crashing', () => {
    render(<AlertMonitor patientId="p-1" />);
    expect(screen.getByText('Alert Monitor')).toBeInTheDocument();
  });

  it('shows stat buttons for severity filters', () => {
    render(<AlertMonitor patientId="p-1" />);
    expect(screen.getByText('Total Alerts')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('renders refresh button', () => {
    render(<AlertMonitor patientId="p-1" />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });
});
