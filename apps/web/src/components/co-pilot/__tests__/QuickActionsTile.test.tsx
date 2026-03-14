/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), transform: null }),
}));
jest.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: jest.fn(() => '') } } }));

import QuickActionsTile from '../QuickActionsTile';

beforeEach(() => jest.clearAllMocks());

describe('QuickActionsTile', () => {
  it('renders Quick Actions title', () => {
    render(<QuickActionsTile />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('shows patient required warning when no patientId is provided', () => {
    render(<QuickActionsTile />);
    expect(screen.getByText(/select a patient/i)).toBeInTheDocument();
  });

  it('calls onAction callback when Print button is clicked (no patient required)', () => {
    const onAction = jest.fn();
    render(<QuickActionsTile patientId="p1" onAction={onAction} />);
    fireEvent.click(screen.getByText('Print'));
    expect(onAction).toHaveBeenCalledWith('print');
  });
});
