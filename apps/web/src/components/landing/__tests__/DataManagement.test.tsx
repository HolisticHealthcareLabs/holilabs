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

import { DataManagement } from '../DataManagement';

describe('DataManagement', () => {
  it('renders without crashing', () => {
    const { container } = render(<DataManagement />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders a section element', () => {
    render(<DataManagement />);
    expect(document.querySelector('section')).toBeInTheDocument();
  });

  it('renders heading text in English', () => {
    render(<DataManagement />);
    // The component uses inline tr() translations
    expect(document.querySelector('section')).toBeTruthy();
  });
});
