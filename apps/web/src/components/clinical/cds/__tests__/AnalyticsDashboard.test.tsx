/** @jest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));

import { AnalyticsDashboard } from '../AnalyticsDashboard';

beforeEach(() => jest.clearAllMocks());

describe('AnalyticsDashboard', () => {
  it('renders dashboard heading after data loads', async () => {
    render(<AnalyticsDashboard />);
    await waitFor(() => expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument());
  });

  it('displays total alert count from mock data', async () => {
    render(<AnalyticsDashboard />);
    await waitFor(() => expect(screen.getByText('487')).toBeInTheDocument());
  });

  it('renders acceptance rate metric', async () => {
    render(<AnalyticsDashboard />);
    await waitFor(() => expect(screen.getByText('Acceptance Rate')).toBeInTheDocument());
  });
});
