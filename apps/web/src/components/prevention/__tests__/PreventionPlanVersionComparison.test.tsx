/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PreventionPlanVersionComparison from '../PreventionPlanVersionComparison';

const version1 = {
  id: 'v1',
  planId: 'plan-1',
  version: 1,
  planData: {
    status: 'ACTIVE',
    goals: [{ goal: 'Exercise daily', status: 'pending' }],
    recommendations: [],
  },
  changes: {},
  changedBy: 'user-1',
  changeReason: 'Initial version',
  createdAt: '2024-01-01T10:00:00Z',
  clinician: { id: 'doc-1', name: 'Dr. Smith' },
};

const version2 = {
  id: 'v2',
  planId: 'plan-1',
  version: 2,
  planData: {
    status: 'ACTIVE',
    goals: [
      { goal: 'Exercise daily', status: 'completed' },
      { goal: 'Eat healthy', status: 'pending' },
    ],
    recommendations: [],
  },
  changes: { goals: true },
  changedBy: 'user-1',
  changeReason: 'Updated goals',
  createdAt: '2024-01-15T10:00:00Z',
  clinician: { id: 'doc-1', name: 'Dr. Smith' },
};

describe('PreventionPlanVersionComparison', () => {
  it('renders both version numbers', () => {
    render(<PreventionPlanVersionComparison version1={version1} version2={version2} onClose={jest.fn()} />);
    expect(screen.getByText('Version 1')).toBeInTheDocument();
    expect(screen.getByText('Version 2')).toBeInTheDocument();
  });

  it('shows goals added count in summary', () => {
    render(<PreventionPlanVersionComparison version1={version1} version2={version2} onClose={jest.fn()} />);
    expect(screen.getByText('Goals Added')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = jest.fn();
    render(<PreventionPlanVersionComparison version1={version1} version2={version2} onClose={onClose} />);
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
