/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { ProblemList } from '../ProblemList';

describe('ProblemList', () => {
  it('renders heading without crashing', () => {
    render(<ProblemList />);
    expect(screen.getByText('Lista de Problemas')).toBeInTheDocument();
  });

  it('shows empty state when no problems', () => {
    render(<ProblemList problems={[]} />);
    expect(screen.getByText(/No hay problemas/)).toBeInTheDocument();
  });

  it('renders problems when provided', () => {
    const problems = [
      { id: 'prob-1', icd10Code: 'I10', description: 'Hipertensión esencial', status: 'active' as const, severity: 'moderate' as const, onsetDate: new Date() },
    ];
    render(<ProblemList problems={problems} />);
    expect(screen.getByText('I10')).toBeInTheDocument();
    expect(screen.getByText('Hipertensión esencial')).toBeInTheDocument();
  });
});
