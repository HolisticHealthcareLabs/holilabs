/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('next/image', () => ({ __esModule: true, default: ({ src, alt }: any) => <img src={src} alt={alt} /> }));

const { ProfessionalOnboarding } = require('../ProfessionalOnboarding');

describe('ProfessionalOnboarding', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders "Welcome to Holi Labs" heading', () => {
    render(<ProfessionalOnboarding />);
    expect(screen.getByText('Welcome to Holi Labs')).toBeInTheDocument();
  });

  it('renders "Activate Notifications" button', () => {
    render(<ProfessionalOnboarding />);
    expect(screen.getByText('Activate Notifications')).toBeInTheDocument();
  });

  it('renders "Continue Without Notifications" button', () => {
    render(<ProfessionalOnboarding />);
    expect(screen.getByText('Continue Without Notifications')).toBeInTheDocument();
  });
});
