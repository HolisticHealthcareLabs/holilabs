/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));

import { RuleManager } from '../RuleManager';

describe('RuleManager', () => {
  it('renders heading without crashing', () => {
    render(<RuleManager rules={[]} />);
    expect(screen.getByText('Rule Manager')).toBeInTheDocument();
  });

  it('shows empty state when no rules', () => {
    render(<RuleManager rules={[]} />);
    expect(screen.getByText('No Rules Found')).toBeInTheDocument();
  });

  it('renders rule stats with provided rules', () => {
    const rules: any[] = [
      { id: 'r1', name: 'Rule A', description: 'Desc', category: 'drug-interaction', severity: 'critical' as const, priority: 1, enabled: true, triggerHooks: ['patient-view' as const], evidenceStrength: 'A' as const },
    ];
    render(<RuleManager rules={rules} />);
    expect(screen.getByText('Total Rules')).toBeInTheDocument();
    expect(screen.getByText('Rule A')).toBeInTheDocument();
  });
});
