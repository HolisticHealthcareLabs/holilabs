/** @jest-environment jsdom */
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('date-fns', () => ({ format: () => '1 de enero, 2024 a las 10:00' }));
jest.mock('date-fns/locale', () => ({ es: {} }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StatusHistoryTimeline from '../StatusHistoryTimeline';

const props = {
  statusHistory: [
    { timestamp: '2024-03-01T10:00:00Z', userId: 'user-1', fromStatus: 'ACTIVE', toStatus: 'COMPLETED', reason: 'all_goals_met' },
  ],
  currentStatus: 'COMPLETED',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('StatusHistoryTimeline', () => {
  it('renders timeline header', () => {
    render(<StatusHistoryTimeline {...props} />);
    expect(screen.getByText('Historial de Estado')).toBeInTheDocument();
  });

  it('shows creation entry', () => {
    render(<StatusHistoryTimeline {...props} />);
    expect(screen.getByText(/Plan creado/i)).toBeInTheDocument();
  });

  it('shows current status badge at bottom', () => {
    render(<StatusHistoryTimeline {...props} />);
    expect(screen.getByText(/Estado actual/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Completado/i).length).toBeGreaterThan(0);
  });
});
