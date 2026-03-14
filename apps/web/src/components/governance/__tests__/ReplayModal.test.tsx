/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/app/admin/governance/actions', () => ({
  validateGovernanceLog: jest.fn().mockResolvedValue({ success: true }),
  ValidationStatus: {},
}));
jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

import { ReplayModal } from '../ReplayModal';

const mockLog = {
  id: 'log-abc-123',
  createdAt: new Date('2024-01-15T10:00:00').toISOString(),
  provider: 'gpt-4',
  safetyScore: 85,
  latencyMs: 250,
  events: [
    { id: 'e1', ruleName: 'PII Detection', severity: 'HARD_BLOCK', actionTaken: 'BLOCKED', description: 'PII detected' },
  ],
};

describe('ReplayModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ReplayModal log={mockLog} isOpen={false} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with log metadata when open', () => {
    render(<ReplayModal log={mockLog} isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Audit Replay')).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<ReplayModal log={mockLog} isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
