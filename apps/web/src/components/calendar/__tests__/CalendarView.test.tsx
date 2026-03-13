/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

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
jest.mock('../CustomDateDisplay', () => ({
  CustomDateDisplay: ({ date, variant }: any) => <div data-testid="custom-date">{variant}</div>,
}));

const { CalendarView } = require('../CalendarView');

describe('CalendarView', () => {
  it('renders without crashing', () => {
    render(<CalendarView />);
    expect(screen.getByText('📅 Agenda')).toBeInTheDocument();
  });

  it('displays view mode selector with Día, Semana, Mes', () => {
    render(<CalendarView />);
    expect(screen.getByText('Día')).toBeInTheDocument();
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Mes')).toBeInTheDocument();
  });

  it('displays today button', () => {
    render(<CalendarView />);
    expect(screen.getByText('Hoy')).toBeInTheDocument();
  });
});
