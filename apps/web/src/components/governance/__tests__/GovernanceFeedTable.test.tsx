/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/components/ui/Badge', () => ({ Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span> }));
jest.mock('../TraceDetailModal', () => ({ __esModule: true, default: ({ isOpen }: any) => isOpen ? React.createElement('div', { 'data-testid': 'trace-modal' }) : null }));

import GovernanceFeedTable from '../GovernanceFeedTable';

const mockLogs = [
  {
    id: 'log-1',
    timestamp: new Date('2024-01-15T10:00:00').toISOString(),
    provider: 'gpt-4',
    safetyScore: 85,
    events: [{ id: 'e1', severity: 'HARD_BLOCK', ruleName: 'PII Detection', actionTaken: 'BLOCKED' }],
  },
  {
    id: 'log-2',
    timestamp: new Date('2024-01-15T11:00:00').toISOString(),
    provider: 'claude-3',
    safetyScore: 95,
    events: [],
  },
];

describe('GovernanceFeedTable', () => {
  it('renders empty state when no logs', () => {
    render(<GovernanceFeedTable logs={[]} />);
    expect(screen.getByText(/No logs found/i)).toBeInTheDocument();
  });

  it('renders log rows with provider and safety score', () => {
    render(<GovernanceFeedTable logs={mockLogs} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('opens TraceDetailModal when a row is clicked', () => {
    render(<GovernanceFeedTable logs={mockLogs} />);
    expect(screen.queryByTestId('trace-modal')).not.toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    fireEvent.click(rows[1]); // first data row
    expect(screen.getByTestId('trace-modal')).toBeInTheDocument();
  });
});
