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
jest.mock('@/components/ui/Button', () => ({ Button: ({ children, ...p }: any) => <button {...p}>{children}</button> }));

import TraceDetailModal from '../TraceDetailModal';

const mockLog = {
  id: 'abcdefgh-1234',
  timestamp: new Date('2024-01-15T10:00:00').toISOString(),
  provider: 'gpt-4',
  safetyScore: 30,
  events: [
    { id: 'e1', ruleName: 'PII Detection', severity: 'HARD_BLOCK', actionTaken: 'BLOCKED', description: 'PHI detected in output' },
  ],
  session: {
    scribeSession: { transcript: 'Patient said they feel unwell.', clinicalNote: null },
  },
  rawModelOutput: null,
};

describe('TraceDetailModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TraceDetailModal isOpen={false} onClose={jest.fn()} log={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders audit trace with log id slice', () => {
    render(<TraceDetailModal isOpen={true} onClose={jest.fn()} log={mockLog} />);
    expect(screen.getByText(/Audit Trace:/i)).toBeInTheDocument();
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
  });

  it('shows CRITICAL BLOCK badge for HARD_BLOCK severity', () => {
    render(<TraceDetailModal isOpen={true} onClose={jest.fn()} log={mockLog} />);
    expect(screen.getByText('CRITICAL BLOCK')).toBeInTheDocument();
  });
});
