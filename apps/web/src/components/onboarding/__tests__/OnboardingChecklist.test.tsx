/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

const OnboardingChecklist = require('../OnboardingChecklist').default;

describe('OnboardingChecklist', () => {
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    jest.useFakeTimers();
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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when permanently hidden', () => {
    localStorageMock['onboarding_checklist_hidden'] = 'true';
    const { container } = render(<OnboardingChecklist />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null before visibility timer fires', () => {
    const { container } = render(<OnboardingChecklist />);
    expect(container.firstChild).toBeNull();
  });

  it('shows floating button after 1s timer fires', () => {
    render(<OnboardingChecklist />);
    act(() => { jest.advanceTimersByTime(1100); });
    expect(screen.getByTitle('Getting started checklist')).toBeInTheDocument();
  });
});
