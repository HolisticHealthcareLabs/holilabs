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

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: { clinicians: [] } }),
  })
) as jest.Mock;

const SelfServiceBooking = require('../SelfServiceBooking').default;

describe('SelfServiceBooking', () => {
  it('renders without crashing', () => {
    render(<SelfServiceBooking />);
    expect(screen.getByText('Book an Appointment')).toBeInTheDocument();
  });

  it('shows provider selection as step 1', () => {
    render(<SelfServiceBooking />);
    expect(screen.getByText('Select a Provider')).toBeInTheDocument();
  });

  it('shows search input for providers', () => {
    render(<SelfServiceBooking />);
    expect(screen.getByPlaceholderText('Search doctors by name or specialty…')).toBeInTheDocument();
  });
});
