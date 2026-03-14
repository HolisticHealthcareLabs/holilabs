/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));

const mockReportWebVitals = jest.fn();
jest.mock('next/web-vitals', () => ({
  useReportWebVitals: (cb: any) => { mockReportWebVitals(cb); },
}));
jest.mock('@/lib/monitoring/web-vitals', () => ({
  reportWebVital: jest.fn(),
  createWebVitalMetric: jest.fn(() => ({ name: 'LCP', value: 100 })),
}));

import { WebVitalsTracker } from '../WebVitalsTracker';
const { reportWebVital, createWebVitalMetric } = require('@/lib/monitoring/web-vitals');

beforeEach(() => jest.clearAllMocks());

describe('WebVitalsTracker', () => {
  it('renders null — adds no DOM nodes', () => {
    const { container } = render(<WebVitalsTracker />);
    expect(container.firstChild).toBeNull();
  });

  it('registers a useReportWebVitals callback', () => {
    render(<WebVitalsTracker />);
    expect(mockReportWebVitals).toHaveBeenCalledTimes(1);
  });

  it('forwards metric to reportWebVital via createWebVitalMetric', () => {
    render(<WebVitalsTracker />);
    const cb = mockReportWebVitals.mock.calls[0][0];
    cb({ name: 'LCP', value: 2500, delta: 100, id: 'v1', navigationType: 'navigate' });
    expect(createWebVitalMetric).toHaveBeenCalledWith('LCP', 2500, 100, 'v1', 'navigate');
    expect(reportWebVital).toHaveBeenCalledTimes(1);
  });
});
