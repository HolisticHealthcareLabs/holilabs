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

const { StatusDropdown } = require('../StatusDropdown');

describe('StatusDropdown', () => {
  const defaultProps = {
    currentStatus: 'SCHEDULED',
    appointmentId: 'apt-1',
    onStatusChange: jest.fn(),
    onNotificationSend: jest.fn(),
  };

  it('renders the trigger button', () => {
    render(<StatusDropdown {...defaultProps} />);
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<StatusDropdown {...defaultProps} />);
    fireEvent.click(screen.getByText('Estado'));
    expect(screen.getByText('Notification')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows notification channels when open', () => {
    render(<StatusDropdown {...defaultProps} />);
    fireEvent.click(screen.getByText('Estado'));
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });
});
