/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: jest.fn() }),
  useMotionValue: () => ({ set: jest.fn(), get: () => 0 }),
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }), usePathname: () => '/test', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', email: 'dr@test.com', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (key: string) => key }) }));

const { DailyViewGrid } = require('../DailyViewGrid');

const mockDate = new Date('2025-06-15');

describe('DailyViewGrid', () => {
  it('renders empty state when no appointments', () => {
    render(<DailyViewGrid date={mockDate} appointments={[]} />);
    expect(screen.getByText('No hay citas programadas')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<DailyViewGrid date={mockDate} appointments={[]} />);
    expect(screen.getByText('Hora')).toBeInTheDocument();
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Doctor')).toBeInTheDocument();
  });

  it('renders appointments when provided', () => {
    const appointments = [
      {
        id: 'a1',
        startTime: new Date('2025-06-15T09:00:00'),
        endTime: new Date('2025-06-15T09:30:00'),
        patient: { id: 'p1', firstName: 'Ana', lastName: 'Garcia' },
        clinician: { id: 'c1', firstName: 'Dr', lastName: 'Martinez' },
        status: 'CONFIRMED',
        situations: [],
      },
    ];
    render(<DailyViewGrid date={mockDate} appointments={appointments} />);
    expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
  });
});
