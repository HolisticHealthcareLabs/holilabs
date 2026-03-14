/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const SchedulingModal = require('../SchedulingModal').default;

describe('SchedulingModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  it('returns null when isOpen is false', () => {
    const { container } = render(<SchedulingModal isOpen={false} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Agendar Cita" heading when open', () => {
    render(<SchedulingModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Agendar Cita')).toBeInTheDocument();
  });

  it('shows Google and Outlook calendar connect buttons', () => {
    render(<SchedulingModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Conectar Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Conectar Outlook Calendar')).toBeInTheDocument();
  });
});
