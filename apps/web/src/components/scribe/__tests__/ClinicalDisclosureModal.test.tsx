/** @jest-environment jsdom */
jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en', t: (k: string) => k }) }));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClinicalDisclosureModal } from '../ClinicalDisclosureModal';

describe('ClinicalDisclosureModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ClinicalDisclosureModal isOpen={false} onAccept={jest.fn()} onClose={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders disclosure content when open', () => {
    render(<ClinicalDisclosureModal isOpen={true} onAccept={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Clinical AI Disclosure (Required)')).toBeInTheDocument();
  });

  it('I Agree button is disabled until checkbox is checked', () => {
    const onAccept = jest.fn();
    render(<ClinicalDisclosureModal isOpen={true} onAccept={onAccept} onClose={jest.fn()} />);
    const agreeButton = screen.getByText('I Agree');
    expect(agreeButton).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(agreeButton).not.toBeDisabled();
  });
});
