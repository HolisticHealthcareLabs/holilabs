/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));

const DemoPatientSetup = require('../DemoPatientSetup').default;

describe('DemoPatientSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, scenarios: [] }),
    }) as jest.Mock;
  });

  it('renders welcome heading', () => {
    render(<DemoPatientSetup />);
    expect(screen.getByText('Welcome to Holi Labs')).toBeInTheDocument();
  });

  it('renders "Skip for Now" button', () => {
    render(<DemoPatientSetup />);
    expect(screen.getByText('Skip for Now')).toBeInTheDocument();
  });

  it('renders "Continue with Demo" button disabled when no scenario selected', () => {
    render(<DemoPatientSetup />);
    const button = screen.getByText('Continue with Demo');
    expect(button).toBeInTheDocument();
    expect(button.closest('button')).toBeDisabled();
  });
});
