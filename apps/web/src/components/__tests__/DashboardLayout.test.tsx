/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, tag: string) => tag }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/dashboard', useSearchParams: () => new URLSearchParams() }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: (_, k) => () => null }));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));

import DashboardLayout from '../DashboardLayout';

beforeEach(() => jest.clearAllMocks());

describe('DashboardLayout', () => {
  it('renders nav items in top mode by default', () => {
    render(<DashboardLayout><div>content</div></DashboardLayout>);
    expect(screen.getByText('Panel')).toBeInTheDocument();
    expect(screen.getByText('Pacientes')).toBeInTheDocument();
  });

  it('renders children in main area', () => {
    render(<DashboardLayout><div data-testid="child">hello</div></DashboardLayout>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('switches to sidebar mode when toggle button is clicked', () => {
    render(<DashboardLayout><div>content</div></DashboardLayout>);
    const toggleBtn = screen.getByTitle('Switch to sidebar navigation');
    fireEvent.click(toggleBtn);
    expect(screen.getByTitle('Switch to top navigation')).toBeInTheDocument();
  });
});
