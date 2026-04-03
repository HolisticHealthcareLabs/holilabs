/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

jest.mock('@heroicons/react/24/outline', () => new Proxy({}, { get: () => () => null }));
jest.mock('@heroicons/react/24/solid', () => new Proxy({}, { get: () => () => null }));

jest.mock('@headlessui/react', () => {
  const Dialog = ({ children }: any) => <div role="dialog">{children}</div>;
  Dialog.Panel = ({ children }: any) => <div>{children}</div>;
  Dialog.Title = ({ children, className }: any) => <h2 className={className}>{children}</h2>;
  const Transition = ({ show, children }: any) => show !== false ? <>{children}</> : null;
  Transition.Root = Transition;
  Transition.Child = ({ children }: any) => <>{children}</>;
  const Fragment = 'div' as any;
  return { Dialog, Transition, Fragment };
});

beforeEach(() => {
  global.fetch = (() => Promise.resolve({
    ok: true,
    json: async () => ({ data: [], total: 0 }),
  })) as any;
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePickerModal } from '../TemplatePickerModal';

describe('TemplatePickerModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <TemplatePickerModal isOpen={false} onClose={jest.fn()} onSelect={jest.fn()} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders modal when open', () => {
    render(<TemplatePickerModal isOpen={true} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows search input when open', () => {
    render(<TemplatePickerModal isOpen={true} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(document.querySelector('input')).toBeInTheDocument();
  });
});
