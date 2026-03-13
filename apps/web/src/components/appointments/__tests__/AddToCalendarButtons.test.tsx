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
jest.mock('lucide-react', () => ({ ChevronDown: (props: any) => <div data-testid="chevron-down" {...props} /> }));
jest.mock('@/lib/calendar/ics-generator', () => ({
  generateGoogleCalendarURL: jest.fn(() => 'https://calendar.google.com/test'),
  generateOutlookCalendarURL: jest.fn(() => 'https://outlook.live.com/test'),
}));

const AddToCalendarButtons = require('../AddToCalendarButtons').default;

const mockAppointment = {
  id: 'apt-1',
  startTime: new Date('2025-06-15T10:00:00Z'),
  endTime: new Date('2025-06-15T11:00:00Z'),
  patientName: 'John Doe',
  clinicianName: 'Dr. Smith',
};

describe('AddToCalendarButtons', () => {
  it('renders without crashing', () => {
    render(<AddToCalendarButtons appointment={mockAppointment} />);
    expect(screen.getByText('Add to Calendar')).toBeInTheDocument();
  });

  it('renders compact variant with dropdown toggle', () => {
    render(<AddToCalendarButtons appointment={mockAppointment} variant="compact" />);
    const button = screen.getByText('📅 Add to Calendar');
    expect(button).toBeInTheDocument();
  });

  it('shows calendar options in default variant', () => {
    render(<AddToCalendarButtons appointment={mockAppointment} />);
    expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Apple Calendar')).toBeInTheDocument();
  });
});
