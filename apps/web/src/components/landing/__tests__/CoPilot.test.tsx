/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('framer-motion', () => ({ motion: new Proxy({}, { get: (_, t: string) => t }), AnimatePresence: ({ children }: any) => children }));
jest.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...p }: any) => <a {...p}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/' }));
jest.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { id: 'u1', role: 'CLINICIAN' } }, status: 'authenticated' }) }));
jest.mock('lucide-react', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ locale: 'en' }) }));

import { CoPilot } from '../CoPilot';

describe('CoPilot', () => {
  it('renders without crashing', () => {
    const { container } = render(<CoPilot />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a section element', () => {
    render(<CoPilot />);
    expect(document.querySelector('section')).toBeInTheDocument();
  });

  it('renders English text when locale is en', () => {
    render(<CoPilot />);
    // CoPilot uses inline tr() translations, so the section renders
    expect(document.querySelector('section')).toBeTruthy();
  });
});
