/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/cds/types', () => ({}), { virtual: true });

const { AlertCard } = require('../AlertCard');

const mockAlert = {
  id: 'alert-1',
  severity: 'warning' as const,
  category: 'drug-interaction',
  title: 'Potential Drug Interaction',
  message: 'Warfarin + Aspirin interaction detected.',
  evidence: ['Study A', 'Study B'],
  suggestedCorrection: 'Review medication list.',
  createdAt: new Date().toISOString(),
};

describe('AlertCard', () => {
  it('renders alert title', () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText('Potential Drug Interaction')).toBeInTheDocument();
  });

  it('renders category label', () => {
    render(<AlertCard alert={mockAlert} />);
    expect(screen.getByText('Drug Interaction')).toBeInTheDocument();
  });

  it('renders compact variant without crashing', () => {
    const { container } = render(<AlertCard alert={mockAlert} compact />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('expands detail view on click', () => {
    render(<AlertCard alert={mockAlert} />);
    const expandButton = screen.getByRole('button', { name: /Potential Drug Interaction/i });
    fireEvent.click(expandButton);
    expect(screen.getByText(/Review medication list\./)).toBeInTheDocument();
  });
});
