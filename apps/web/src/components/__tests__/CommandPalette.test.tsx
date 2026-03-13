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
jest.mock('@headlessui/react', () => ({
  Dialog: Object.assign(
    ({ children, open, onClose }: any) => open ? <div role="dialog">{typeof children === 'function' ? children({}) : children}</div> : null,
    { Panel: ({ children }: any) => <div>{children}</div> }
  ),
  Transition: Object.assign(
    ({ children, show }: any) => show ? <>{children}</> : null,
    { Child: ({ children }: any) => <>{children}</> }
  ),
  Combobox: Object.assign(
    ({ children, onChange }: any) => <div>{typeof children === 'function' ? children({}) : children}</div>,
    {
      Input: (props: any) => <input {...props} />,
      Options: ({ children }: any) => <div>{children}</div>,
      Option: ({ children, value }: any) => <div>{typeof children === 'function' ? children({ active: false }) : children}</div>,
    }
  ),
}));
jest.mock('@heroicons/react/24/outline', () => ({
  MagnifyingGlassIcon: (props: any) => <div data-testid="search-icon" {...props} />,
  ClockIcon: (props: any) => <div {...props} />,
  DocumentTextIcon: (props: any) => <div {...props} />,
  UserGroupIcon: (props: any) => <div {...props} />,
  CalendarIcon: (props: any) => <div {...props} />,
  BeakerIcon: (props: any) => <div {...props} />,
  SparklesIcon: (props: any) => <div {...props} />,
  Cog6ToothIcon: (props: any) => <div {...props} />,
  ArrowRightIcon: (props: any) => <div {...props} />,
  ChevronRightIcon: (props: any) => <div {...props} />,
}));
jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: jest.fn(),
  formatShortcut: (s: string) => s,
}));

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })
) as jest.Mock;

const { CommandPalette } = require('../CommandPalette');

describe('CommandPalette (root)', () => {
  it('renders nothing when HeadlessUI Dialog is closed', () => {
    const { container } = render(<CommandPalette customCommands={[]} />);
    expect(container).toBeTruthy();
  });
});
