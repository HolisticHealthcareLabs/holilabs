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
  const Dialog = ({ open, children }: any) => open ? <div role="dialog">{children}</div> : null;
  Dialog.Panel = ({ children }: any) => <div>{children}</div>;
  Dialog.Title = ({ children }: any) => <h2>{children}</h2>;
  const Transition = ({ show, children }: any) => show ? <>{children}</> : null;
  Transition.Root = Transition;
  Transition.Child = ({ children }: any) => <>{children}</>;
  return { Dialog, Transition, Fragment: ({ children }: any) => <>{children}</> };
});

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ templates: [], total: 0 }),
  }) as any;
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
