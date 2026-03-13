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
jest.mock('@headlessui/react', () => ({
  Menu: ({ children }: any) => <div>{children}</div>,
  Transition: ({ children, show }: any) => show ? <>{children}</> : null,
}));
jest.mock('@heroicons/react/24/outline', () => ({
  CheckIcon: (props: any) => <div {...props} />,
  ChevronRightIcon: (props: any) => <div {...props} />,
}));
jest.mock('@/hooks/useKeyboardShortcuts', () => ({
  formatShortcut: (s: string) => s,
}));

const { ContextMenu } = require('../ContextMenu');

const items = [
  { id: 'edit', label: 'Edit', action: jest.fn() },
  { id: 'delete', label: 'Delete', danger: true, action: jest.fn() },
];

describe('ContextMenu', () => {
  it('renders children', () => {
    render(
      <ContextMenu items={items}>
        <div>Right-click me</div>
      </ContextMenu>
    );
    expect(screen.getByText('Right-click me')).toBeInTheDocument();
  });

  it('renders as click trigger when configured', () => {
    render(
      <ContextMenu items={items} trigger="click">
        <button>Click me</button>
      </ContextMenu>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
