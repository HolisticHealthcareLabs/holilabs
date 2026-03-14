/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/demo/demo-data-generator', () => ({ enableDemoMode: jest.fn() }));

const ImprovedWelcomeModal = require('../ImprovedWelcomeModal').default;

describe('ImprovedWelcomeModal', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] ?? null,
        setItem: (key: string, val: string) => { localStorageMock[key] = val; },
        removeItem: (key: string) => { delete localStorageMock[key]; },
      },
      writable: true,
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    Object.defineProperty(window, 'location', { value: { reload: jest.fn() }, writable: true });
  });

  it('renders null when has_seen_welcome is set', () => {
    localStorageMock['has_seen_welcome'] = 'true';
    const { container } = render(<ImprovedWelcomeModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal on first visit', () => {
    render(<ImprovedWelcomeModal />);
    expect(screen.getByText('Welcome to Your Clinical Dashboard')).toBeInTheDocument();
  });

  it('advances to next step when "Start Tour" is clicked', () => {
    render(<ImprovedWelcomeModal />);
    fireEvent.click(screen.getByText('Start Tour'));
    expect(screen.getByText('AI-Powered Clinical Documentation')).toBeInTheDocument();
  });
});
